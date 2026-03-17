import mongoose, { Schema, Document } from 'mongoose';

export interface IIncomeTransaction extends Document {
  companyId: mongoose.Types.ObjectId;
  date: Date;
  category: 'Operating' | 'Non-Operating' | 'Other';
  description: string;
  amount: number;
  gstApplicable: boolean;
  gstRate: number;
  gstAmount: number;
  totalWithGst: number;
  branch?: string;
  costCentre?: string;
  financialYear: string;
  month: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incomeTransactionSchema = new Schema<IIncomeTransaction>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  date: { type: Date, required: true },
  category: { type: String, enum: ['Operating', 'Non-Operating', 'Other'], required: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  gstApplicable: { type: Boolean, default: false },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalWithGst: { type: Number, required: true },
  branch: { type: String, trim: true },
  costCentre: { type: String, trim: true },
  financialYear: { type: String, required: true, index: true },
  month: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

incomeTransactionSchema.index({ companyId: 1, financialYear: 1, month: 1 });

export const IncomeTransaction = mongoose.model<IIncomeTransaction>('IncomeTransaction', incomeTransactionSchema);
