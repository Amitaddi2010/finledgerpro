import mongoose, { Schema, Document } from 'mongoose';

export interface ILineItem {
  description: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
}

export interface IGSTInvoice extends Document {
  companyId: mongoose.Types.ObjectId;
  invoiceNo: string;
  date: Date;
  partyName: string;
  partyGSTIN?: string;
  type: 'B2B' | 'B2C' | 'export';
  lineItems: ILineItem[];
  totalTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  financialYear: string;
  month: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<ILineItem>({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
}, { _id: false });

const gstInvoiceSchema = new Schema<IGSTInvoice>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  invoiceNo: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  partyName: { type: String, required: true, trim: true },
  partyGSTIN: { type: String, trim: true },
  type: { type: String, enum: ['B2B', 'B2C', 'export'], required: true },
  lineItems: [lineItemSchema],
  totalTaxable: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  financialYear: { type: String, required: true, index: true },
  month: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

gstInvoiceSchema.index({ companyId: 1, financialYear: 1, month: 1 });
// invoiceNo unique per company, not globally
gstInvoiceSchema.index({ companyId: 1, invoiceNo: 1 }, { unique: true, sparse: false });

export const GSTInvoice = mongoose.model<IGSTInvoice>('GSTInvoice', gstInvoiceSchema);
