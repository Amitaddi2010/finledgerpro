import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  financialYearStart: number; // month 4 = April
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>({
  name: { type: String, required: true, trim: true },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  financialYearStart: { type: Number, default: 4 },
}, { timestamps: true });

export const Company = mongoose.model<ICompany>('Company', companySchema);
