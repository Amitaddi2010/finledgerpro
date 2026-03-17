import mongoose, { Schema, Document } from 'mongoose';

export interface IBankEntry {
  _id: mongoose.Types.ObjectId;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  matchedTransactionId?: mongoose.Types.ObjectId;
}

export interface IBankStatement extends Document {
  companyId: mongoose.Types.ObjectId;
  accountName: string;
  financialYear: string;
  statementDate: Date;
  entries: IBankEntry[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bankEntrySchema = new Schema<IBankEntry>({
  date: { type: Date, required: true },
  description: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  matchedTransactionId: { type: Schema.Types.ObjectId },
});

const bankStatementSchema = new Schema<IBankStatement>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  accountName: { type: String, default: 'Bank Account' },
  financialYear: { type: String, required: true },
  statementDate: { type: Date, required: true },
  entries: [bankEntrySchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

bankStatementSchema.index({ companyId: 1, financialYear: 1 });

export const BankStatement = mongoose.model<IBankStatement>('BankStatement', bankStatementSchema);
