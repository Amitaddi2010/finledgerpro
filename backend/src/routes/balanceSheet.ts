import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { BalanceSheetEntry } from '../models/BalanceSheetEntry';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';

const router = Router();

// GET entries for a FY
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const filter: any = { companyId: new mongoose.Types.ObjectId(req.companyId) };
    if (financialYear) filter.financialYear = financialYear;
    const entries = await BalanceSheetEntry.find(filter).sort({ financialYear: 1, month: 1 });
    res.json({ entries });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch balance sheet entries' });
  }
});

// POST create/upsert entry (unique on companyId+financialYear+month)
router.post('/', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, companyId: req.companyId };
    if (!data.financialYear?.trim()) return res.status(400).json({ error: 'financialYear is required' });
    if (!data.month?.trim()) return res.status(400).json({ error: 'month is required' });
    if (!data.date) data.date = new Date();
    const entry = await BalanceSheetEntry.findOneAndUpdate(
      { companyId: req.companyId, financialYear: data.financialYear, month: data.month },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ entry });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to save entry' });
  }
});

// DELETE entry
router.delete('/:id', authMiddleware, rbac('super_admin', 'ca'), async (req: AuthRequest, res: Response) => {
  try {
    const entry = await BalanceSheetEntry.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
