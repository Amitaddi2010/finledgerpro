import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { GSTInvoice } from '../models/GSTInvoice';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';

const router = Router();

// GET all invoices
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear, month } = req.query;
    const filter: any = { companyId: new mongoose.Types.ObjectId(req.companyId) };
    if (financialYear) filter.financialYear = financialYear;
    if (month) filter.month = month;
    const invoices = await GSTInvoice.find(filter).sort({ date: -1 });
    res.json({ invoices });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST create invoice
router.post('/', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceNo, date, partyName, partyGSTIN, type, lineItems, financialYear, month } = req.body;

    if (!invoiceNo?.trim()) return res.status(400).json({ error: 'invoiceNo is required' });
    if (!partyName?.trim()) return res.status(400).json({ error: 'partyName is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    if (!financialYear?.trim()) return res.status(400).json({ error: 'financialYear is required' });
    if (!month?.trim()) return res.status(400).json({ error: 'month is required' });
    if (!Array.isArray(lineItems) || lineItems.length === 0) return res.status(400).json({ error: 'At least one line item is required' });
    const items = (lineItems || []).map((l: any) => ({
      description: l.description,
      amount: Number(l.amount) || 0,
      gstRate: Number(l.gstRate) || 0,
      gstAmount: ((Number(l.amount) || 0) * (Number(l.gstRate) || 0)) / 100,
    }));

    const totalTaxable = items.reduce((s: number, l: any) => s + l.amount, 0);
    const totalGST = items.reduce((s: number, l: any) => s + l.gstAmount, 0);

    // IGST for export/inter-state, split CGST+SGST for intra-state B2B/B2C
    const isIGST = type === 'export';
    const cgst = isIGST ? 0 : totalGST / 2;
    const sgst = isIGST ? 0 : totalGST / 2;
    const igst = isIGST ? totalGST : 0;

    const invoice = await GSTInvoice.create({
      companyId: req.companyId,
      invoiceNo,
      date,
      partyName,
      partyGSTIN,
      type,
      lineItems: items,
      totalTaxable,
      cgst,
      sgst,
      igst,
      total: totalTaxable + totalGST,
      financialYear,
      month,
      createdBy: req.user!._id,
    });

    res.status(201).json({ invoice });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create invoice' });
  }
});

// DELETE invoice
router.delete('/:id', authMiddleware, rbac('super_admin', 'ca'), async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await GSTInvoice.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Deleted' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

export default router;
