import mongoose, { Schema, Document } from 'mongoose';

export interface IFinancialTarget extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYear: string;
  metric: string;
  annualTarget: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const financialTargetSchema = new Schema<IFinancialTarget>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  financialYear: { type: String, required: true },
  metric: { type: String, required: true },
  annualTarget: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

financialTargetSchema.index({ companyId: 1, financialYear: 1 });

export const FinancialTarget = mongoose.model<IFinancialTarget>('FinancialTarget', financialTargetSchema);
