import mongoose from 'mongoose';
import { IncomeTransaction, ExpenseTransaction, Budget, BalanceSheetEntry, FinancialTarget } from '../models';
import { formatINR, FY_MONTHS, getMonthsElapsed } from './formatINR';

export async function buildFinancialContext(companyIdStr: string, financialYear: string): Promise<string> {
  const monthsElapsed = getMonthsElapsed(financialYear);
  const companyId = new mongoose.Types.ObjectId(companyIdStr);

  const [incomeByMonth, expenseByMonth, expenseByCategory, budgets, bsLatest, targets] = await Promise.all([
    IncomeTransaction.aggregate([
      { $match: { companyId: companyId, financialYear } },
      { $group: { _id: '$month', total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    ExpenseTransaction.aggregate([
      { $match: { companyId: companyId, financialYear } },
      { $group: { _id: '$month', total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    ExpenseTransaction.aggregate([
      { $match: { companyId: companyId, financialYear } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    Budget.find({ companyId, financialYear }),
    BalanceSheetEntry.findOne({ companyId, financialYear }).sort({ date: -1 }),
    FinancialTarget.find({ companyId, financialYear }),
  ]);

  const totalIncome = incomeByMonth.reduce((s: number, m: any) => s + m.total, 0);
  const totalExpenses = expenseByMonth.reduce((s: number, m: any) => s + m.total, 0);
  const cogsTotal = (await ExpenseTransaction.aggregate([
    { $match: { companyId, financialYear, category: 'COGS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]))[0]?.total || 0;

  const grossProfit = totalIncome - cogsTotal;
  const netProfit = totalIncome - totalExpenses;
  const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const grossMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  const incomeMap: Record<string, number> = {};
  incomeByMonth.forEach((m: any) => { incomeMap[m._id] = m.total; });
  const expenseMap: Record<string, number> = {};
  expenseByMonth.forEach((m: any) => { expenseMap[m._id] = m.total; });

  const monthlyPL = FY_MONTHS.slice(0, monthsElapsed).map(month => ({
    month,
    revenue: incomeMap[month] || 0,
    expenses: expenseMap[month] || 0,
    net: (incomeMap[month] || 0) - (expenseMap[month] || 0),
  }));

  const totalBudget = budgets.reduce((s, b) => s + b.annualBudget, 0);
  const totalSpent = totalExpenses;
  const utilPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const overBudget = budgets.filter(b => {
    const spent = totalSpent; // simplified
    return spent > b.annualBudget;
  }).map(b => b.category);

  const revTarget = targets.find(t => t.metric === 'Revenue');
  const expTarget = targets.find(t => t.metric === 'Expenses');
  const proratedRevTarget = revTarget ? (revTarget.annualTarget / 12) * monthsElapsed : 0;
  const proratedExpTarget = expTarget ? (expTarget.annualTarget / 12) * monthsElapsed : 0;
  const revDelta = proratedRevTarget > 0 ? ((totalIncome - proratedRevTarget) / proratedRevTarget) * 100 : 0;
  const expDelta = proratedExpTarget > 0 ? ((totalExpenses - proratedExpTarget) / proratedExpTarget) * 100 : 0;

  const bs = bsLatest;
  const currentRatio = bs && bs.currentLiabilities > 0 ? bs.currentAssets / bs.currentLiabilities : 0;
  const quickRatio = bs && bs.currentLiabilities > 0 ? (bs.currentAssets - bs.inventory) / bs.currentLiabilities : 0;
  const debtToEquity = bs && bs.shareholdersEquity > 0 ? bs.totalDebt / bs.shareholdersEquity : 0;
  const roe = bs && bs.shareholdersEquity > 0 ? (netProfit / bs.shareholdersEquity) * 100 : 0;
  const roce = bs && bs.capitalEmployed > 0 ? ((grossProfit - (totalExpenses - cogsTotal)) / bs.capitalEmployed) * 100 : 0;
  const assetTurnover = bs && bs.totalAssets > 0 ? totalIncome / bs.totalAssets : 0;

  return `
COMPANY FINANCIAL CONTEXT — ${financialYear} (Indian FY April–March)
Currency: INR (₹). All amounts in Indian number format (lakhs/crores).

== PROFITABILITY SUMMARY ==
Total Revenue: ₹${formatINR(totalIncome)}
Total Expenses: ₹${formatINR(totalExpenses)}
Gross Profit: ₹${formatINR(grossProfit)}
Net Profit: ₹${formatINR(netProfit)}
Gross Margin: ${grossMargin.toFixed(2)}%
Net Margin: ${netMargin.toFixed(2)}%

== MONTH-WISE P&L (Apr–${FY_MONTHS[monthsElapsed - 1] || 'Mar'}) ==
${monthlyPL.map(m => `${m.month}: Revenue ₹${formatINR(m.revenue)}, Expenses ₹${formatINR(m.expenses)}, Net ₹${formatINR(m.net)}`).join('\n')}

== TOP 5 EXPENSE CATEGORIES ==
${expenseByCategory.map((e: any, i: number) => `${i + 1}. ${e._id}: ₹${formatINR(e.total)} (${totalExpenses > 0 ? ((e.total / totalExpenses) * 100).toFixed(1) : 0}% of total)`).join('\n')}

== PRORATED TARGETS vs ACTUALS ==
Revenue Target (prorated): ₹${formatINR(proratedRevTarget)} | Actual: ₹${formatINR(totalIncome)} | Delta: ${revDelta > 0 ? '+' : ''}${revDelta.toFixed(1)}%
Expense Target (prorated): ₹${formatINR(proratedExpTarget)} | Actual: ₹${formatINR(totalExpenses)} | Delta: ${expDelta > 0 ? '+' : ''}${expDelta.toFixed(1)}%

== KEY FINANCIAL RATIOS ==
Gross Margin: ${grossMargin.toFixed(2)}% | Net Margin: ${netMargin.toFixed(2)}%
Current Ratio: ${currentRatio.toFixed(2)} | Quick Ratio: ${quickRatio.toFixed(2)}
Debt-to-Equity: ${debtToEquity.toFixed(2)} | ROE: ${roe.toFixed(2)}%
ROCE: ${roce.toFixed(2)}% | Asset Turnover: ${assetTurnover.toFixed(2)}x

== BUDGET STATUS ==
Total Budget: ₹${formatINR(totalBudget)} | Spent: ₹${formatINR(totalSpent)} | Utilisation: ${utilPct.toFixed(1)}%
Over-budget categories: ${overBudget.length > 0 ? overBudget.join(', ') : 'None'}
`;
}
