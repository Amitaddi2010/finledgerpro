import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { GSTInvoice } from '../models/GSTInvoice';
import { ExpenseTransaction } from '../models/ExpenseTransaction';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GSTR-1: outward supply summary from invoices
router.get('/gstr1-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear, month } = req.query;
    const filter: any = { companyId: new mongoose.Types.ObjectId(req.companyId) };
    if (financialYear) filter.financialYear = financialYear;
    if (month) filter.month = month;

    const invoices = await GSTInvoice.find(filter);

    const bucketMap: Record<string, { count: number; taxable: number; cgst: number; sgst: number; igst: number }> = {};
    for (const inv of invoices) {
      if (!bucketMap[inv.type]) bucketMap[inv.type] = { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      bucketMap[inv.type].count++;
      bucketMap[inv.type].taxable += inv.totalTaxable;
      bucketMap[inv.type].cgst += inv.cgst;
      bucketMap[inv.type].sgst += inv.sgst;
      bucketMap[inv.type].igst += inv.igst;
    }

    const buckets = Object.entries(bucketMap).map(([type, v]) => ({
      type,
      ...v,
      totalTax: v.cgst + v.sgst + v.igst,
    }));

    const totalTaxable = invoices.reduce((s, i) => s + i.totalTaxable, 0);
    const totalGST = invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);

    res.json({
      totalInvoices: invoices.length,
      totalTaxable,
      totalGST,
      totalValue: totalTaxable + totalGST,
      buckets,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to compute GSTR-1' });
  }
});

// GSTR-3B: net GST payable = output tax (invoices) - ITC (expense transactions with gstInput)
router.get('/gstr3b-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear, month } = req.query;
    const filter: any = { companyId: new mongoose.Types.ObjectId(req.companyId) };
    if (financialYear) filter.financialYear = financialYear;
    if (month) filter.month = month;

    const [invoices, expenses] = await Promise.all([
      GSTInvoice.find(filter),
      ExpenseTransaction.find({ ...filter, gstInput: true }),
    ]);

    const outputTax = invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const inputTaxCredit = expenses.reduce((s, e) => s + (e.gstAmount || 0), 0);
    const netPayable = Math.max(0, outputTax - inputTaxCredit);

    // Rate-wise breakup
    const rateMap: Record<number, { outputTaxable: number; outputTax: number; inputTaxable: number; itc: number }> = {};
    for (const inv of invoices) {
      for (const item of inv.lineItems) {
        const r = item.gstRate;
        if (!rateMap[r]) rateMap[r] = { outputTaxable: 0, outputTax: 0, inputTaxable: 0, itc: 0 };
        rateMap[r].outputTaxable += item.amount;
        rateMap[r].outputTax += item.gstAmount;
      }
    }
    for (const exp of expenses) {
      const r = exp.gstRate || 0;
      if (!rateMap[r]) rateMap[r] = { outputTaxable: 0, outputTax: 0, inputTaxable: 0, itc: 0 };
      rateMap[r].inputTaxable += exp.amount;
      rateMap[r].itc += exp.gstAmount || 0;
    }

    const rateBreakup = Object.entries(rateMap)
      .map(([rate, v]) => ({ rate: Number(rate), ...v }))
      .sort((a, b) => a.rate - b.rate);

    res.json({ outputTax, inputTaxCredit, netPayable, rateBreakup });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to compute GSTR-3B' });
  }
});

export default router;
