import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'import' | 'export' | 'login' | 'logout';
  entity: string;
  entityId?: mongoose.Types.ObjectId;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['create', 'update', 'delete', 'import', 'export', 'login', 'logout'], required: true },
  entity: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  details: { type: String },
  ipAddress: { type: String },
}, { timestamps: true });

auditLogSchema.index({ companyId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
