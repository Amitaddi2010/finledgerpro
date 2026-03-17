import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { IncomeTransaction, ExpenseTransaction } from '../models';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';

const router = Router();

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const normalizeMonth = (v: unknown): string | null => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  const map: Record<string, string> = {
    apr: 'Apr',
    april: 'Apr',
    '4': 'Apr',
    may: 'May',
    '5': 'May',
    jun: 'Jun',
    june: 'Jun',
    '6': 'Jun',
    jul: 'Jul',
    july: 'Jul',
    '7': 'Jul',
    aug: 'Aug',
    august: 'Aug',
    '8': 'Aug',
    sep: 'Sep',
    sept: 'Sep',
    september: 'Sep',
    '9': 'Sep',
    oct: 'Oct',
    october: 'Oct',
    '10': 'Oct',
    nov: 'Nov',
    november: 'Nov',
    '11': 'Nov',
    dec: 'Dec',
    december: 'Dec',
    '12': 'Dec',
    jan: 'Jan',
    january: 'Jan',
    '1': 'Jan',
    feb: 'Feb',
    february: 'Feb',
    '2': 'Feb',
    mar: 'Mar',
    march: 'Mar',
    '3': 'Mar',
  };
  const normalized = map[s] || map[s.replace(/^0+/, '')] || null;
  return normalized && FY_MONTHS.includes(normalized) ? normalized : null;
};

// ========== INCOME TRANSACTIONS ==========

// GET all income transactions
router.get('/income', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear, month, category, branch, costCentre, page = '1', limit = '50' } = req.query;
    const filter: any = { companyId: req.companyId };
    if (financialYear) filter.financialYear = financialYear;
    if (month) filter.month = month;
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (costCentre) filter.costCentre = costCentre;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [transactions, total] = await Promise.all([
      IncomeTransaction.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit as string)),
      IncomeTransaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income transactions' });
  }
});

// POST create income transaction
router.post('/income', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const normalizedMonth = normalizeMonth(req.body?.month);
    if (!normalizedMonth) {
      return res.status(400).json({ error: 'Invalid month. Use Apr/May/…/Mar.' });
    }
    const data = { ...req.body, month: normalizedMonth, companyId: req.companyId, createdBy: req.user!._id };
    if (data.gstApplicable && data.gstRate) {
      data.gstAmount = (data.amount * data.gstRate) / 100;
      data.totalWithGst = data.amount + data.gstAmount;
    } else {
      data.gstAmount = 0;
      data.totalWithGst = data.amount;
    }
    const transaction = await IncomeTransaction.create(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create income transaction' });
  }
});

// PUT update income transaction
router.put('/income/:id', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await IncomeTransaction.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE income transaction
router.delete('/income/:id', authMiddleware, rbac('super_admin', 'ca'), async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await IncomeTransaction.findOneAndDelete(
      { _id: req.params.id, companyId: req.companyId }
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ========== EXPENSE TRANSACTIONS ==========

router.get('/expense', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear, month, category, branch, costCentre, vendor, page = '1', limit = '50' } = req.query;
    const filter: any = { companyId: req.companyId };
    if (financialYear) filter.financialYear = financialYear;
    if (month) filter.month = month;
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (costCentre) filter.costCentre = costCentre;
    if (vendor) filter.vendor = { $regex: vendor, $options: 'i' };

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [transactions, total] = await Promise.all([
      ExpenseTransaction.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit as string)),
      ExpenseTransaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense transactions' });
  }
});

router.post('/expense', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const normalizedMonth = normalizeMonth(req.body?.month);
    if (!normalizedMonth) {
      return res.status(400).json({ error: 'Invalid month. Use Apr/May/…/Mar.' });
    }
    const data = { ...req.body, month: normalizedMonth, companyId: req.companyId, createdBy: req.user!._id };
    if (data.gstInput && data.gstRate) {
      data.gstAmount = (data.amount * data.gstRate) / 100;
    } else {
      data.gstAmount = 0;
    }
    const transaction = await ExpenseTransaction.create(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense transaction' });
  }
});

router.put('/expense/:id', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await ExpenseTransaction.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.delete('/expense/:id', authMiddleware, rbac('super_admin', 'ca'), async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await ExpenseTransaction.findOneAndDelete(
      { _id: req.params.id, companyId: req.companyId }
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ========== AGGREGATIONS ==========

// Income summary
router.get('/income/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.companyId);
    const filter: any = { companyId };
    if (financialYear) filter.financialYear = financialYear;

    const [byMonth, byCategory, total] = await Promise.all([
      IncomeTransaction.aggregate([
        { $match: filter },
        { $group: { _id: '$month', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      IncomeTransaction.aggregate([
        { $match: filter },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      IncomeTransaction.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ byMonth, byCategory, total: total[0]?.total || 0, count: total[0]?.count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income summary' });
  }
});

// Expense summary
router.get('/expense/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.companyId);
    const filter: any = { companyId };
    if (financialYear) filter.financialYear = financialYear;

    const [byMonth, byCategory, total] = await Promise.all([
      ExpenseTransaction.aggregate([
        { $match: filter },
        { $group: { _id: '$month', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ExpenseTransaction.aggregate([
        { $match: filter },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      ExpenseTransaction.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ byMonth, byCategory, total: total[0]?.total || 0, count: total[0]?.count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

export default router;
