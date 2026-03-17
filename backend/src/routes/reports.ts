import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { IncomeTransaction, ExpenseTransaction, BalanceSheetEntry, FinancialTarget } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { computeRatios } from '../lib/ratioCalculator';
import { FY_MONTHS, getMonthsElapsed } from '../lib/formatINR';

const router = Router();

// P&L Statement
router.get('/pl-statement', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.companyId);

    const [incomeByMonthCat, expenseByMonthCat] = await Promise.all([
      IncomeTransaction.aggregate([
        { $match: { companyId, financialYear } },
        { $group: { _id: { month: '$month', category: '$category' }, total: { $sum: '$amount' } } },
      ]),
      ExpenseTransaction.aggregate([
        { $match: { companyId, financialYear } },
        { $group: { _id: { month: '$month', category: '$category' }, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Build month-wise P&L
    const plData: Record<string, any> = {};
    FY_MONTHS.forEach((month) => {
      plData[month] = { revenue: 0, cogs: 0, opex: 0, capex: 0, finance: 0, tax: 0, other: 0 };
    });

    incomeByMonthCat.forEach((item: any) => {
      if (plData[item._id.month]) {
        plData[item._id.month].revenue += item.total;
      }
    });

    expenseByMonthCat.forEach((item: any) => {
      if (plData[item._id.month]) {
        const cat = (item._id.category || '').toLowerCase();
        if (cat === 'cogs') plData[item._id.month].cogs += item.total;
        else if (cat === 'opex') plData[item._id.month].opex += item.total;
        else if (cat === 'capex') plData[item._id.month].capex += item.total;
        else if (cat === 'finance') plData[item._id.month].finance += item.total;
        else if (cat === 'tax') plData[item._id.month].tax += item.total;
        else plData[item._id.month].other += item.total;
      }
    });

    // Compute totals and also expose a `monthly` map for the frontend
    const months = FY_MONTHS.map((month) => {
      const d = plData[month];
      const grossProfit = d.revenue - d.cogs;
      const totalExpenses = d.cogs + d.opex + d.capex + d.finance + d.tax + d.other;
      const ebit = grossProfit - d.opex;
      const netProfit = d.revenue - totalExpenses;
      return {
        month,
        revenue: d.revenue,
        cogs: d.cogs,
        grossProfit,
        opex: d.opex,
        capex: d.capex,
        ebit,
        finance: d.finance,
        tax: d.tax,
        other: d.other,
        totalExpenses,
        netProfit,
        grossMargin: d.revenue > 0 ? (grossProfit / d.revenue) * 100 : 0,
        netMargin: d.revenue > 0 ? (netProfit / d.revenue) * 100 : 0,
        operatingMargin: d.revenue > 0 ? (ebit / d.revenue) * 100 : 0,
      };
    });

    const totals = months.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        cogs: acc.cogs + m.cogs,
        grossProfit: acc.grossProfit + m.grossProfit,
        opex: acc.opex + m.opex,
        ebit: acc.ebit + m.ebit,
        finance: acc.finance + m.finance,
        tax: acc.tax + m.tax,
        totalExpenses: acc.totalExpenses + m.totalExpenses,
        netProfit: acc.netProfit + m.netProfit,
      }),
      { revenue: 0, cogs: 0, grossProfit: 0, opex: 0, ebit: 0, finance: 0, tax: 0, totalExpenses: 0, netProfit: 0 },
    );

    const monthly: Record<string, any> = {};
    months.forEach((m) => {
      monthly[m.month] = m;
    });

    res.json({ months, totals, monthly, financialYear });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate P&L statement' });
  }
});

// YoY Comparison
router.get('/yoy-comparison', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.companyId);
    const currentFY = financialYear as string;
    const prevYear = parseInt(currentFY.split('-')[0]) - 1;
    const prevFY = `${prevYear}-${(prevYear + 1).toString().slice(-2)}`;
    const monthsElapsed = getMonthsElapsed(currentFY);

    const [currentIncome, currentExpense, prevIncome, prevExpense, targets] = await Promise.all([
      IncomeTransaction.aggregate([
        { $match: { companyId, financialYear: currentFY } },
        { $group: { _id: '$month', total: { $sum: '$amount' } } },
      ]),
      ExpenseTransaction.aggregate([
        { $match: { companyId, financialYear: currentFY } },
        { $group: { _id: '$month', total: { $sum: '$amount' } } },
      ]),
      IncomeTransaction.aggregate([
        { $match: { companyId, financialYear: prevFY } },
        { $group: { _id: '$month', total: { $sum: '$amount' } } },
      ]),
      ExpenseTransaction.aggregate([
        { $match: { companyId, financialYear: prevFY } },
        { $group: { _id: '$month', total: { $sum: '$amount' } } },
      ]),
      FinancialTarget.find({ companyId, financialYear: currentFY }),
    ]);

    const toMap = (arr: any[]) => {
      const map: Record<string, number> = {};
      arr.forEach((a) => {
        map[a._id] = a.total;
      });
      return map;
    };

    const curIncMap = toMap(currentIncome);
    const curExpMap = toMap(currentExpense);
    const prevIncMap = toMap(prevIncome);
    const prevExpMap = toMap(prevExpense);

    const curRevTotal = Object.values(curIncMap).reduce((a, b) => a + b, 0);
    const curExpTotal = Object.values(curExpMap).reduce((a, b) => a + b, 0);
    const prevRevTotal = Object.values(prevIncMap).reduce((a, b) => a + b, 0);
    const prevExpTotal = Object.values(prevExpMap).reduce((a, b) => a + b, 0);

    const revTarget = targets.find((t) => t.metric === 'Revenue');
    const expTarget = targets.find((t) => t.metric === 'Expenses');
    const profitTarget = targets.find((t) => t.metric === 'NetProfit');

    const buildMetric = (name: string, currentVal: number, prevVal: number, target?: any) => {
      const proratedTarget = target ? (target.annualTarget / 12) * monthsElapsed : 0;
      const deltaFromTarget = proratedTarget > 0 ? currentVal - proratedTarget : 0;
      const deltaFromTargetPct = proratedTarget > 0 ? (deltaFromTarget / proratedTarget) * 100 : 0;
      const yoyDelta = currentVal - prevVal;
      const yoyDeltaPct = prevVal > 0 ? (yoyDelta / prevVal) * 100 : 0;

      let status = '✅ On Track';
      if (deltaFromTargetPct < -10) status = '🔴 Off Track';
      else if (deltaFromTargetPct < 0) status = '⚠️ Slightly Behind';

      return {
        metric: name,
        prevActual: prevVal,
        annualTarget: target?.annualTarget || 0,
        proratedTarget,
        currentActual: currentVal,
        deltaFromTarget,
        deltaFromTargetPct,
        yoyDelta,
        yoyDeltaPct,
        status,
      };
    };

    const metrics = [
      buildMetric('Revenue', curRevTotal, prevRevTotal, revTarget),
      buildMetric('Expenses', curExpTotal, prevExpTotal, expTarget),
      buildMetric('Net Profit', curRevTotal - curExpTotal, prevRevTotal - prevExpTotal, profitTarget),
    ];

    // Monthly breakdown (for dashboard + YoY page)
    const monthlyData = FY_MONTHS.map((month) => ({
      month,
      currentRevenue: curIncMap[month] || 0,
      previousRevenue: prevIncMap[month] || 0,
      currentExpense: curExpMap[month] || 0,
      previousExpense: prevExpMap[month] || 0,
      proratedRevTarget: revTarget ? revTarget.annualTarget / 12 : 0,
    }));

    // Shape expected by YoYComparison page
    const summary = {
      revenue: {
        current: curRevTotal,
        previous: prevRevTotal,
        target: revTarget?.annualTarget || 0,
      },
      expenses: {
        current: curExpTotal,
        previous: prevExpTotal,
        target: expTarget?.annualTarget || 0,
      },
      netProfit: {
        current: curRevTotal - curExpTotal,
        previous: prevRevTotal - prevExpTotal,
        target: profitTarget?.annualTarget || 0,
      },
    };

    const comparison = monthlyData.map((m) => {
      const current = m.currentRevenue;
      const previous = m.previousRevenue;
      const target = m.proratedRevTarget;
      const yoyGrowth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      const targetVariance = target > 0 ? ((current - target) / target) * 100 : 0;
      return {
        month: m.month,
        currentRevenue: current,
        previousRevenue: previous,
        targetRevenue: target,
        yoyGrowth,
        targetVariance,
      };
    });

    res.json({ metrics, monthlyData, summary, comparison, currentFY, prevFY, monthsElapsed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate YoY comparison' });
  }
});

// Financial Ratios
router.get('/ratios', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.companyId);

    const [currentBS, previousEntries] = await Promise.all([
      BalanceSheetEntry.findOne({ companyId, financialYear }).sort({ date: -1 }),
      BalanceSheetEntry.find({ companyId }).sort({ date: -1 }).limit(12),
    ]);

    if (!currentBS) {
      // Fallback: derive only profitability-style ratios from transactions for this FY
      const [revAgg, expAgg] = await Promise.all([
        IncomeTransaction.aggregate([
          { $match: { companyId, financialYear } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        ExpenseTransaction.aggregate([
          { $match: { companyId, financialYear } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);
      const revenue = revAgg[0]?.total || 0;
      const expenses = expAgg[0]?.total || 0;
      const netProfit = revenue - expenses;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return res.json({
        ratios: {
          netMargin,
        },
        trend: [],
        message: 'Balance sheet not uploaded yet. Showing limited ratios derived from transactions.',
      });
    }

    const ratios = computeRatios(currentBS);

    // Trend data (last 12 months)
    const trend = previousEntries.map(entry => ({
      month: entry.month,
      financialYear: entry.financialYear,
      ratios: computeRatios(entry),
    })).reverse();

    res.json({ ratios, trend, currentMonth: currentBS.month });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute ratios' });
  }
});

export default router;
