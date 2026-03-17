import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import mongoose from 'mongoose';
import { BankStatement } from '../models/BankStatement';
import { IncomeTransaction } from '../models/IncomeTransaction';
import { ExpenseTransaction } from '../models/ExpenseTransaction';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';
const pdf = require('pdf-parse');

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

      let content = '';
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(dataBuffer);
        content = data.text;
      } else {
        content = fs.readFileSync(req.file.path, 'utf-8').replace(/^\uFEFF/, '');
      }

      const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      
      if (rawLines.length < 2) {
        return res.status(400).json({ error: 'File must have a header row and data rows' });
      }

      // Delimiter detection - checking first few non-empty lines
      const sampleLines = rawLines.slice(0, 10);
      const sample = sampleLines.join('\n');
      let delimiter = ',';
      const commas = (sample.match(/,/g) || []).length;
      const semicolons = (sample.match(/;/g) || []).length;
      const tabs = (sample.match(/\t/g) || []).length;
      const spaces = (sample.match(/ {2,}/g) || []).length; // Check for double spaces common in fixed-width

      if (semicolons > commas && semicolons > tabs) delimiter = ';';
      else if (tabs > commas && tabs > semicolons) delimiter = '\t';
      else if (spaces > commas && spaces > 5) delimiter = '  '; // Detect multiple-space delimiter

      console.log(`DEBUG: Using delimiter: "${delimiter === '\t' ? '\\t' : delimiter}"`);

      const splitCsv = (line: string, delim: string) => {
        if (delim === '  ') return line.split(/ {2,}/).map(s => s.trim()).filter(Boolean);
        const out: string[] = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQ = !inQ; }
            continue;
          }
          if (ch === delim && !inQ) { out.push(cur); cur = ''; continue; }
          cur += ch;
        }
        out.push(cur);
        const results = out.map(s => s.trim());
        if (results.length === 1 && line.includes(' ') && !line.includes(',')) {
          const spaceSplit = line.split(/\s+/).filter(Boolean);
          if (spaceSplit.length >= 3) return spaceSplit;
        }
        return results;
      };

      let headerIdx = -1;
      let headers: string[] = [];
      const dateAliases = ['date', 'txndate', 'transactiondate', 'valuedate', 'txn_date', 'transaction_date', 'tran_date', 'post_date', 'booking_date'];
      const descAliases = ['description', 'narration', 'particulars', 'remarks', 'details', 'trans_details', 'transactiondetails', 'transaction_details', 'payee', 'rawtransactionline', 'memo'];

      // PHASE 1: Keyword search
      for (let i = 0; i < Math.min(rawLines.length, 50); i++) {
        const cols = splitCsv(rawLines[i], delimiter).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
        const hasDate = cols.some(c => dateAliases.includes(c));
        const hasDesc = cols.some(c => descAliases.includes(c));
        
        if (hasDate && (hasDesc || cols.length >= 3)) {
          headerIdx = i;
          headers = cols;
          console.log(`DEBUG: Found headers at row ${i}:`, headers);
          break;
        }
      }

      // PHASE 2: Pattern Sniffing
      if (headerIdx < 0) {
        console.log('DEBUG: No clear headers. Sniffing data patterns...');
        for (let i = 0; i < Math.min(rawLines.length, 50); i++) {
          const line = rawLines[i];
          const cols = splitCsv(line, delimiter);
          if (cols.length < 1) continue;
          
          if (tryParseDate(cols[0])) {
            headerIdx = i - 1;
            headers = Array.from({length: cols.length}, (_, k) => `col_${k}`);
            break;
          }
          
          const dateMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
          if (dateMatch) {
            headerIdx = i - 1;
            headers = ['extracted_date', 'description', 'extracted_amount', 'extracted_balance'];
            break;
          }
        }
      }

      if (headerIdx < -1 || (headerIdx < 0 && rawLines.length > 0)) {
        const firstLine = splitCsv(rawLines[0], delimiter);
        return res.status(400).json({ 
          error: 'Could not detect column headers or data patterns.',
          details: `Found: "${firstLine.join(' | ')}". Please ensure your file has "Date" and "Description" columns.`
        });
      }

      const actualStartIdx = headerIdx < 0 ? 0 : headerIdx + 1;
      const idx = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1;

      let dateIdx = idx(dateAliases);
      let descIdx = idx(descAliases);
      let debitIdx = idx(['debit', 'dr', 'withdrawal', 'withdrawalamount', 'withdrawalamt', 'amount(dr)', 'out', 'payment', 'withdr', 'amount']);
      let creditIdx = idx(['credit', 'cr', 'deposit', 'depositamount', 'depositamt', 'amount(cr)', 'in', 'receipt', 'depo']);
      let amountIdx = idx(['amount', 'value', 'transactionamount', 'amt', 'txn_amt', 'transaction_amt']);
      let balanceIdx = idx(['balance', 'closingbalance', 'runningbalance', 'bal']);

      if (headers.includes('extracted_date')) {
        dateIdx = 0; descIdx = 1;
      } else {
        if (dateIdx < 0) dateIdx = 0; 
        if (descIdx < 0) descIdx = headers.length > 1 ? 1 : 0;
        if (debitIdx < 0 && creditIdx < 0 && amountIdx < 0) {
          if (headers.length > 2) amountIdx = 2;
          else if (headers.length === 1) amountIdx = 0;
        }
      }

      const entries: any[] = [];
      const companyId = new mongoose.Types.ObjectId(req.companyId);

      for (let i = actualStartIdx; i < rawLines.length; i++) {
        const line = rawLines[i];
        const cols = splitCsv(line, delimiter);
        if (cols.length < 1) continue;

        let date: Date | null = null;
        let description = '';
        let rowDebit = 0;
        let rowCredit = 0;
        let rowBalance = 0;

        if (headers.includes('extracted_date') && cols.length < 3) {
          const dateMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
          if (dateMatch) {
            date = tryParseDate(dateMatch[0]);
            const remaining = line.replace(dateMatch[0], '').trim();
            const nums = remaining.match(/(-?\d{1,12}(?:,\d{3})*(?:\.\d{2,3})?)/g);
            if (nums && nums.length >= 2) {
              rowBalance = cleanVal(nums[nums.length - 1]);
              const amtStr = nums[nums.length - 2];
              const amt = cleanVal(amtStr);
              if (amt < 0) rowDebit = Math.abs(amt); else rowCredit = amt;
              description = remaining.split(amtStr)[0].trim();
            } else if (nums && nums.length === 1) {
              const amt = cleanVal(nums[0]);
              if (amt < 0) rowDebit = Math.abs(amt); else rowCredit = amt;
              description = remaining.split(nums[0])[0].trim();
            } else {
              description = remaining;
            }

            // Cleanup embedded junk often attached at the end of UPI descriptions
            // e.g. "UPI-MSSHRIRAM... 00005457 01/04/" or "EAZY000054570082220201/04/"
            // Match any 10+ digit number optionally followed by Date segments (01/04 or 01/04/2025)
            description = description.replace(/(?:\d{10,})?(?:[\s_]*\d{2}[\s\/\-]+\d{2}(?:[\s\/\-]+\d{0,4})?[\s\/\-]*)?$/g, '').trim();
          }
        } else {
          date = tryParseDate(cols[dateIdx]);
          description = (descIdx === dateIdx && cols.length > 1) ? cols[1] : (cols[descIdx] || '');
          rowDebit = cleanVal(cols[debitIdx]);
          rowCredit = cleanVal(cols[creditIdx]);
          rowBalance = cleanVal(cols[balanceIdx]);

          if (rowDebit === 0 && rowCredit === 0 && amountIdx >= 0 && amountIdx < cols.length) {
            const amt = cleanVal(cols[amountIdx]);
            if (amt < 0) rowDebit = Math.abs(amt); else rowCredit = amt;
          }
        }

        if (!date || isNaN(date.getTime())) continue;
        
        const finalDesc = description.replace(/\s+/g, ' ').replace(/^"/, '').replace(/"$/, '').trim() || 'Unknown Entry';
        
        entries.push({ 
          date, 
          description: finalDesc, 
          debit: rowDebit, 
          credit: rowCredit, 
          balance: rowBalance 
        });
      }

      function cleanVal(str: string | undefined): number {
        if (!str) return 0;
        let val = str.trim();
        if (val.startsWith('(') && val.endsWith(')')) val = '-' + val.slice(1, -1);
        val = val.replace(/[^0-9.-]/g, '');
        return parseFloat(val) || 0;
      }

      function tryParseDate(str: string): Date | null {
        if (!str || str.length > 15) return null;
        // Try parts-based parsing FIRST to avoid locale issues (DD/MM/YYYY)
        const parts = str.split(/[\/\- \.]/).filter(Boolean);
        if (parts.length >= 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let yearRaw = parts[2];
          if (yearRaw.length > 4) yearRaw = yearRaw.slice(0, 4);
          const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw) : parseInt(yearRaw);
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
            const alt = new Date(year, month, day, 12, 0, 0); // Use noon to prevent day-shifting
            if (!isNaN(alt.getTime())) return alt;
          }
        }
        const d = new Date(str);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
          d.setHours(12, 0, 0, 0);
          return d;
        }
        return null;
      }

      if (!entries.length) return res.status(400).json({ error: 'No valid data rows found. Check your date format.' });

      const financialYear = req.body.financialYear || '';
      const accountName = req.body.accountName || 'Bank Account';

      const statement = await BankStatement.create({
        companyId,
        accountName,
        financialYear,
        statementDate: entries[entries.length - 1].date,
        entries,
        createdBy: req.user!._id,
      });

      res.json({ statementId: statement._id, count: entries.length });
    } catch (e: any) {
      console.error('Import error:', e);
      res.status(500).json({ error: e.message || 'Import failed' });
    } finally {
      try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
  }
);

// POST AI Auto-Reconcile
router.post('/auto-match/:id', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const statement = await BankStatement.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!statement) return res.status(404).json({ error: 'Statement not found' });

    const companyId = new mongoose.Types.ObjectId(req.companyId);
    let matchedCount = 0;

    for (const entry of statement.entries) {
      if (entry.matchedTransactionId) continue;

      const date = new Date(entry.date);
      const start = new Date(date); start.setDate(date.getDate() - 7);
      const end = new Date(date); end.setDate(date.getDate() + 7);

      const isExpenseMode = entry.debit > 0;
      const amount = isExpenseMode ? entry.debit : entry.credit;

      // Try matching against BOTH models if search in primary fails 
      // (Handles cases where banks put Withdrawal in Credit by mistake)
      const primaryModel = isExpenseMode ? ExpenseTransaction : IncomeTransaction;
      const secondaryModel = isExpenseMode ? IncomeTransaction : ExpenseTransaction;

      let potentialMatch = await (primaryModel as any).findOne({
        companyId,
        amount,
        date: { $gte: start, $lte: end },
      });

      if (!potentialMatch) {
        potentialMatch = await (secondaryModel as any).findOne({
          companyId,
          amount,
          date: { $gte: start, $lte: end },
        });
      }

      if (potentialMatch) {
        entry.matchedTransactionId = potentialMatch._id as any;
        matchedCount++;
      }
    }

    await statement.save();
    res.json({ message: `Successfully matched ${matchedCount} entries`, matchedCount });
  } catch (e: any) {
    console.error('Auto-match error:', e);
    res.status(500).json({ error: 'Failed to perform auto-reconciliation' });
  }
});

// POST match a bank entry to a transaction
router.post('/match', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const { statementId, entryId, transactionId } = req.body;
    const statement = await BankStatement.findOne({ _id: statementId, companyId: req.companyId });
    if (!statement) return res.status(404).json({ error: 'Statement not found' });

    const entry = statement.entries.find((e: any) => e._id.toString() === entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    (entry as any).matchedTransactionId = transactionId;
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

    const entry = statement.entries.find((e: any) => e._id.toString() === entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    (entry as any).matchedTransactionId = undefined;
    await statement.save();
    res.json({ message: 'Unmatched' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to unmatch' });
  }
});

// DELETE a statement
router.delete('/statements/:id', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const statement = await BankStatement.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!statement) return res.status(404).json({ error: 'Statement not found' });
    
    await BankStatement.deleteOne({ _id: req.params.id });
    res.json({ message: 'Statement deleted successfully' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to delete statement' });
  }
});

export default router;
