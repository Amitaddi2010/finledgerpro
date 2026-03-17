import { IBalanceSheetEntry } from '../models/BalanceSheetEntry';

export interface FinancialRatios {
  // Profitability
  grossProfitMargin: number;
  netProfitMargin: number;
  operatingProfitMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  ebitdaMargin: number;
  // Liquidity
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  // Solvency
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number;
  equityMultiplier: number;
  // Efficiency
  assetTurnover: number;
  inventoryTurnover: number;
  debtorTurnover: number;
  creditorTurnover: number;
  daysSalesOutstanding: number;
  daysPayableOutstanding: number;
  workingCapitalRatio: number;
}

export function computeRatios(bs: IBalanceSheetEntry): FinancialRatios {
  const safe = (num: number, den: number) => den !== 0 ? num / den : 0;

  return {
    // Profitability
    grossProfitMargin: safe(bs.grossProfit, bs.netRevenue) * 100,
    netProfitMargin: safe(bs.netProfit, bs.netRevenue) * 100,
    operatingProfitMargin: safe(bs.ebit, bs.netRevenue) * 100,
    returnOnAssets: safe(bs.netProfit, bs.totalAssets) * 100,
    returnOnEquity: safe(bs.netProfit, bs.shareholdersEquity) * 100,
    returnOnCapitalEmployed: safe(bs.ebit, bs.capitalEmployed) * 100,
    ebitdaMargin: safe(bs.ebitda, bs.netRevenue) * 100,
    // Liquidity
    currentRatio: safe(bs.currentAssets, bs.currentLiabilities),
    quickRatio: safe(bs.currentAssets - bs.inventory, bs.currentLiabilities),
    cashRatio: safe(bs.cashAndEquivalents, bs.currentLiabilities),
    // Solvency
    debtToEquity: safe(bs.totalDebt, bs.shareholdersEquity),
    debtToAssets: safe(bs.totalDebt, bs.totalAssets),
    interestCoverage: safe(bs.ebit, bs.interestExpense),
    equityMultiplier: safe(bs.totalAssets, bs.shareholdersEquity),
    // Efficiency
    assetTurnover: safe(bs.netRevenue, bs.totalAssets),
    inventoryTurnover: safe(bs.cogs, bs.inventory),
    debtorTurnover: safe(bs.netCreditSales, bs.receivables),
    creditorTurnover: safe(bs.netCreditPurchases, bs.payables),
    daysSalesOutstanding: safe(365, safe(bs.netCreditSales, bs.receivables)),
    daysPayableOutstanding: safe(365, safe(bs.netCreditPurchases, bs.payables)),
    workingCapitalRatio: safe(bs.currentAssets - bs.currentLiabilities, bs.totalAssets) * 100,
  };
}
