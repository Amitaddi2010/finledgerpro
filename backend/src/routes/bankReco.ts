import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import mongoose from 'mongoose';
import { BankStatement } from '../models/BankStatement';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// GET all statements for company/FY
router.get('/statements', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const filter: any = { companyId: new mongoose.Types.ObjectId(req.companyId) };
    if (financialYear) filter.financialYear = financialYear;
    const statements = await BankStatement.find(filter).sort({ statementDate: -1 }).select('-entries');
    res.json({ statements });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

// GET single statement with entries
router.get('/statements/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const statement = await BankStatement.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!statement) return res.status(404).json({ error: 'Statement not found' });
    res.json({ statement });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

// POST import CSV bank statement
router.post(
  '/import',
  authMiddleware,
  rbac('super_admin', 'ca', 'finance_team'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const content = fs.readFileSync(req.file.path, 'utf-8');
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return res.status(400).json({ error: 'File must have header + data rows' });

      const splitCsv = (line: string) => {
        const out: string[] = [];
        let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; continue; }
          if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue; }
          cur += ch;
        }
        out.push(cur);
        return out.map(s => s.trim());
      };

      const headers = splitCsv(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
      const idx = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1;

      const dateIdx = idx(['date']);
      const descIdx = idx(['description', 'narration', 'particulars', 'details']);
      const debitIdx = idx(['debit', 'dr', 'withdrawal', 'withdrawalamount']);
      const creditIdx = idx(['credit', 'cr', 'deposit', 'depositamount']);
      const balanceIdx = idx(['balance', 'closingbalance', 'runningbalance']);

      if (dateIdx < 0 || descIdx < 0) {
        return res.status(400).json({ error: 'CSV must have date and description columns' });
      }

      const entries: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = splitCsv(lines[i]);
        const dateRaw = cols[dateIdx];
        const parsedDate = new Date(dateRaw);
        if (isNaN(parsedDate.getTime())) continue;

        const clean = (idx: number) => parseFloat((cols[idx] || '0').replace(/[^0-9.-]/g, '')) || 0;

        entries.push({
          date: parsedDate,
          description: cols[descIdx] || '',
          debit: debitIdx >= 0 ? clean(debitIdx) : 0,
          credit: creditIdx >= 0 ? clean(creditIdx) : 0,
          balance: balanceIdx >= 0 ? clean(balanceIdx) : 0,
        });
      }

      if (!entries.length) return res.status(400).json({ error: 'No valid rows found in CSV' });

      const financialYear = req.body.financialYear || '';
      const accountName = req.body.accountName || 'Bank Account';

      const statement = await BankStatement.create({
        companyId: req.companyId,
        accountName,
        financialYear,
        statementDate: entries[entries.length - 1].date,
        entries,
        createdBy: req.user!._id,
      });

      res.json({ statementId: statement._id, count: entries.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Import failed' });
    } finally {
      try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
  }
);

// POST match a bank entry to a transaction
router.post('/match', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const { statementId, entryId, transactionId } = req.body;
    const statement = await BankStatement.findOne({ _id: statementId, companyId: req.companyId });
    if (!statement) return res.status(404).json({ error: 'Statement not found' });

    const entry = statement.entries.id(entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    entry.matchedTransactionId = transactionId;
    await statement.save();
    res.json({ message: 'Matched' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to match' });
  }
});

// POST unmatch a bank entry
router.post('/unmatch', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const { statementId, entryId } = req.body;
    const statement = await BankStatement.findOne({ _id: statementId, companyId: req.companyId });
    if (!statement) return res.status(404).json({ error: 'Statement not found' });

    const entry = statement.entries.id(entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    entry.matchedTransactionId = undefined;
    await statement.save();
    res.json({ message: 'Unmatched' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to unmatch' });
  }
});

export default router;
