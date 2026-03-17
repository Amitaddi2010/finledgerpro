import mongoose, { Schema, Document } from 'mongoose';

export interface IBalanceSheetEntry extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYear: string;
  month: string;
  date: Date;
  // Assets
  totalAssets: number;
  currentAssets: number;
  cashAndEquivalents: number;
  inventory: number;
  receivables: number;
  nonCurrentAssets: number;
  // Liabilities
  totalLiabilities: number;
  currentLiabilities: number;
  payables: number;
  nonCurrentLiabilities: number;
  totalDebt: number;
  // Equity
  shareholdersEquity: number;
  retainedEarnings: number;
  // P&L items for ratio computation
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  ebit: number;
  interestExpense: number;
  depreciation: number;
  ebitda: number;
  netProfit: number;
  netCreditSales: number;
  netCreditPurchases: number;
  capitalEmployed: number;
  createdAt: Date;
  updatedAt: Date;
}

const balanceSheetEntrySchema = new Schema<IBalanceSheetEntry>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  financialYear: { type: String, required: true },
  month: { type: String, required: true },
  date: { type: Date, required: true },
  totalAssets: { type: Number, default: 0 },
  currentAssets: { type: Number, default: 0 },
  cashAndEquivalents: { type: Number, default: 0 },
  inventory: { type: Number, default: 0 },
  receivables: { type: Number, default: 0 },
  nonCurrentAssets: { type: Number, default: 0 },
  totalLiabilities: { type: Number, default: 0 },
  currentLiabilities: { type: Number, default: 0 },
  payables: { type: Number, default: 0 },
  nonCurrentLiabilities: { type: Number, default: 0 },
  totalDebt: { type: Number, default: 0 },
  shareholdersEquity: { type: Number, default: 0 },
  retainedEarnings: { type: Number, default: 0 },
  netRevenue: { type: Number, default: 0 },
  cogs: { type: Number, default: 0 },
  grossProfit: { type: Number, default: 0 },
  operatingExpenses: { type: Number, default: 0 },
  ebit: { type: Number, default: 0 },
  interestExpense: { type: Number, default: 0 },
  depreciation: { type: Number, default: 0 },
  ebitda: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },
  netCreditSales: { type: Number, default: 0 },
  netCreditPurchases: { type: Number, default: 0 },
  capitalEmployed: { type: Number, default: 0 },
}, { timestamps: true });

balanceSheetEntrySchema.index({ companyId: 1, financialYear: 1, month: 1 }, { unique: true });

export const BalanceSheetEntry = mongoose.model<IBalanceSheetEntry>('BalanceSheetEntry', balanceSheetEntrySchema);
