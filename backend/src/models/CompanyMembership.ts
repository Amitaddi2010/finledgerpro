import mongoose, { Schema, Document } from 'mongoose';
import type { UserRole } from './User';

export type MembershipStatus = 'active' | 'invited' | 'suspended';

export interface ICompanyMembership extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  role: UserRole;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const companyMembershipSchema = new Schema<ICompanyMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    role: { type: String, enum: ['super_admin', 'ca', 'finance_team', 'auditor'], required: true },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

companyMembershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });

export const CompanyMembership = mongoose.model<ICompanyMembership>('CompanyMembership', companyMembershipSchema);

