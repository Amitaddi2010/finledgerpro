import mongoose, { Schema, Document } from 'mongoose';

export interface IMonthlyBudget {
  month: string;
  allocated: number;
}

export interface IBudget extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYear: string;
  category: string;
  subCategory?: string;
  annualBudget: number;
  monthlyBreakdown: IMonthlyBudget[];
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  status: 'draft' | 'pending' | 'approved' | 'amended';
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  financialYear: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  annualBudget: { type: Number, required: true },
  monthlyBreakdown: [{
    month: { type: String, required: true },
    allocated: { type: Number, required: true },
  }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'amended'], default: 'draft' },
}, { timestamps: true });

budgetSchema.index({ companyId: 1, financialYear: 1, category: 1 });

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);
