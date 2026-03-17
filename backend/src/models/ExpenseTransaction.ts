import mongoose, { Schema, Document } from 'mongoose';

export type ExpenseCategory = 'COGS' | 'Opex' | 'Capex' | 'Finance' | 'Tax' | 'Other';

export interface IExpenseTransaction extends Document {
  companyId: mongoose.Types.ObjectId;
  date: Date;
  category: ExpenseCategory;
  subCategory?: string;
  description: string;
  amount: number;
  gstInput: boolean;
  gstRate: number;
  gstAmount: number;
  vendor?: string;
  branch?: string;
  costCentre?: string;
  financialYear: string;
  month: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseTransactionSchema = new Schema<IExpenseTransaction>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  date: { type: Date, required: true },
  category: { type: String, enum: ['COGS', 'Opex', 'Capex', 'Finance', 'Tax', 'Other'], required: true },
  subCategory: { type: String, trim: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  gstInput: { type: Boolean, default: false },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  vendor: { type: String, trim: true },
  branch: { type: String, trim: true },
  costCentre: { type: String, trim: true },
  financialYear: { type: String, required: true, index: true },
  month: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

expenseTransactionSchema.index({ companyId: 1, financialYear: 1, month: 1 });
expenseTransactionSchema.index({ companyId: 1, category: 1 });

export const ExpenseTransaction = mongoose.model<IExpenseTransaction>('ExpenseTransaction', expenseTransactionSchema);
