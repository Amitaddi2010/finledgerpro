import { Router, Response } from 'express';
import { IncomeTransaction, ExpenseTransaction, BalanceSheetEntry, Budget } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { FY_MONTHS } from '../lib/formatINR';

const router = Router();

// Generic chart data endpoint
router.get('/charts/:chartType', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { chartType } = req.params;
    const { financialYear, branch, costCentre } = req.query;
    const companyId = req.companyId;

    const filter: any = { companyId };
    if (financialYear) filter.financialYear = financialYear;
    if (branch) filter.branch = branch;
    if (costCentre) filter.costCentre = costCentre;

    switch (chartType) {
      case 'revenue-expense-trend': {
        const currentFY = financialYear as string;
        const prevYear = parseInt(currentFY.split('-')[0]) - 1;
        const prevFY = `${prevYear}-${(prevYear + 1).toString().slice(-2)}`;

        const [curIncome, curExpense, prevIncome, prevExpense] = await Promise.all([
          IncomeTransaction.aggregate([{ $match: { ...filter, financialYear: currentFY } }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { ...filter, financialYear: currentFY } }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
          IncomeTransaction.aggregate([{ $match: { companyId, financialYear: prevFY } }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { companyId, financialYear: prevFY } }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
        ]);

        const toMap = (arr: any[]) => { const m: any = {}; arr.forEach(a => m[a._id] = a.total); return m; };
        const data = FY_MONTHS.map(month => ({
          month,
          currentRevenue: toMap(curIncome)[month] || 0,
          currentExpense: toMap(curExpense)[month] || 0,
          prevRevenue: toMap(prevIncome)[month] || 0,
          prevExpense: toMap(prevExpense)[month] || 0,
        }));
        return res.json(data);
      }

      case 'expense-breakdown': {
        const data = await ExpenseTransaction.aggregate([
          { $match: filter },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]);
        const total = data.reduce((s: number, d: any) => s + d.total, 0);
        return res.json(data.map((d: any) => ({ category: d._id, amount: d.total, count: d.count, percentage: total > 0 ? (d.total / total) * 100 : 0 })));
      }

      case 'income-sources': {
        const data = await IncomeTransaction.aggregate([
          { $match: filter },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]);
        return res.json(data.map((d: any) => ({ category: d._id, amount: d.total, count: d.count })));
      }

      case 'margin-trend': {
        const [income, cogs, expenses] = await Promise.all([
          IncomeTransaction.aggregate([{ $match: filter }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { ...filter, category: 'COGS' } }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: filter }, { $group: { _id: '$month', total: { $sum: '$amount' } } }]),
        ]);
        const iMap: any = {}; income.forEach((i: any) => iMap[i._id] = i.total);
        const cMap: any = {}; cogs.forEach((c: any) => cMap[c._id] = c.total);
        const eMap: any = {}; expenses.forEach((e: any) => eMap[e._id] = e.total);

        const data = FY_MONTHS.map(month => {
          const rev = iMap[month] || 0;
          const c = cMap[month] || 0;
          const e = eMap[month] || 0;
          return {
            month,
            grossMargin: rev > 0 ? ((rev - c) / rev) * 100 : 0,
            netMargin: rev > 0 ? ((rev - e) / rev) * 100 : 0,
          };
        });
        return res.json(data);
      }

      case 'budget-vs-actual': {
        const [budgets, expenses] = await Promise.all([
          Budget.find({ companyId, financialYear }),
          ExpenseTransaction.aggregate([{ $match: filter }, { $group: { _id: '$category', total: { $sum: '$amount' } } }]),
        ]);
        const expMap: any = {}; expenses.forEach((e: any) => expMap[e._id] = e.total);
        const data = budgets.map(b => ({
          category: b.category,
          budget: b.annualBudget,
          actual: expMap[b.category] || 0,
          variance: b.annualBudget - (expMap[b.category] || 0),
        }));
        return res.json(data);
      }

      case 'top-expenses': {
        const data = await ExpenseTransaction.aggregate([
          { $match: filter },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
          { $limit: 10 },
        ]);
        return res.json(data.map((d: any) => ({ category: d._id, amount: d.total })));
      }

      case 'waterfall': {
        const [totalIncome, cogsTotal, opexTotal, financeTotal, taxTotal] = await Promise.all([
          IncomeTransaction.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { ...filter, category: 'COGS' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { ...filter, category: 'Opex' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { ...filter, category: 'Finance' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
          ExpenseTransaction.aggregate([{ $match: { ...filter, category: 'Tax' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        ]);

        const revenue = totalIncome[0]?.total || 0;
        const cogs = cogsTotal[0]?.total || 0;
        const opex = opexTotal[0]?.total || 0;
        const finance = financeTotal[0]?.total || 0;
        const tax = taxTotal[0]?.total || 0;

        return res.json([
          { name: 'Revenue', value: revenue, type: 'total' },
          { name: 'COGS', value: -cogs, type: 'expense' },
          { name: 'Gross Profit', value: revenue - cogs, type: 'subtotal' },
          { name: 'Opex', value: -opex, type: 'expense' },
          { name: 'EBIT', value: revenue - cogs - opex, type: 'subtotal' },
          { name: 'Finance Cost', value: -finance, type: 'expense' },
          { name: 'Tax', value: -tax, type: 'expense' },
          { name: 'Net Profit', value: revenue - cogs - opex - finance - tax, type: 'total' },
        ]);
      }

      default:
        return res.status(400).json({ error: 'Unknown chart type' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
