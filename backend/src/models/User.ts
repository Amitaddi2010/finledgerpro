import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'super_admin' | 'ca' | 'finance_team' | 'auditor';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  companyId?: mongoose.Types.ObjectId; // legacy single-company field (kept for backward compatibility)
  defaultCompanyId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['super_admin', 'ca', 'finance_team', 'auditor'], required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  defaultCompanyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);
