import { Router, Response } from 'express';
import multer from 'multer';
import { IncomeTransaction, ExpenseTransaction } from '../models';
import { BalanceSheetEntry } from '../models/BalanceSheetEntry';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

router.post(
  '/csv',
  authMiddleware,
  rbac('super_admin', 'ca', 'finance_team'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    let fs: typeof import('fs') | null = null;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!req.companyId) {
        return res.status(400).json({ error: 'No active company selected for import' });
      }

      const { type = 'income' } = req.body;
      fs = await import('fs');
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const rawLines = content.split(/\r?\n/);

      const nonEmptyLines = rawLines
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      if (nonEmptyLines.length < 2) {
        return res.status(400).json({ error: 'File must have a header row and at least one data row' });
      }

      const splitCsvLine = (line: string) => {
        const out: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            // handle escaped quotes ""
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
            continue;
          }
          if (ch === ',' && !inQuotes) {
            out.push(cur);
            cur = '';
            continue;
          }
          cur += ch;
        }
        out.push(cur);
        return out;
      };

      const key = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, '');
      const headerRow = splitCsvLine(nonEmptyLines[0]);
      const headers = headerRow.map((h) => key(h));
      const records: any[] = [];

      const clean = (v: any) => String(v ?? '').trim().replace(/^"|"$/g, '');
      const normalizeIncomeCategory = (v: string) => {
        const s = clean(v).toLowerCase();
        if (s === 'operating') return 'Operating';
        if (s === 'non-operating' || s === 'non operating') return 'Non-Operating';
        return 'Other';
      };
      const normalizeExpenseCategory = (v: string) => {
        const s = clean(v).toLowerCase();
        if (s === 'cogs') return 'COGS';
        if (s === 'opex' || s === 'operating expenses' || s === 'operating expense') return 'Opex';
        if (s === 'capex') return 'Capex';
        if (s === 'finance' || s === 'finance cost') return 'Finance';
        if (s === 'tax' || s === 'gst' || s === 'tds') return 'Tax';
        return 'Other';
      };
      const normalizeMonth = (v: string): string | null => {
        const s = clean(v).toLowerCase();
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
        const normalized = map[s] || map[s.replace(/^0+/, '')];
        return normalized && FY_MONTHS.includes(normalized) ? normalized : null;
      };
      const normalizeFinancialYear = (v: string): string | null => {
        const s = clean(v);
        if (!s) return null;
        const match = s.match(/(\d{4})\D*(\d{2,4})/);
        if (!match) return null;
        const start = parseInt(match[1], 10);
        const endRaw = match[2];
        const end = endRaw.length === 2 ? parseInt(endRaw, 10) : parseInt(endRaw.slice(-2), 10);
        const endTwo = end < 100 ? end : parseInt(String(end).slice(-2), 10);
        return `${start}-${endTwo.toString().padStart(2, '0')}`;
      };

      const rowErrors: { row: number; message: string }[] = [];

      for (let i = 1; i < nonEmptyLines.length; i++) {
        const csvLine = nonEmptyLines[i];
        const values = splitCsvLine(csvLine).map((v) => v.trim());
        if (values.every((v) => v === '')) continue;

        const record: any = {};
        headers.forEach((h, idx) => {
          record[h] = values[idx] || '';
        });

        const get = (...keys: string[]) => {
          for (const k of keys) {
            const kk = key(k);
            if (record[kk] !== undefined) return record[kk];
          }
          return '';
        };

        const dateRaw = clean(get('date'));
        const amountRaw = clean(get('amount', 'value', 'amt'));
        const fyRaw = clean(get('financialyear', 'financial_year', 'financial year', 'fy'));
        const monthRaw = clean(get('month'));

        const rowNumber = i + 1; // including header
        const parsedDate = dateRaw ? new Date(dateRaw) : new Date();
        if (Number.isNaN(parsedDate.getTime())) {
          rowErrors.push({ row: rowNumber, message: 'Invalid date' });
          continue;
        }

        const amount = parseFloat(amountRaw);
        if (!Number.isFinite(amount) || amount <= 0) {
          rowErrors.push({ row: rowNumber, message: 'Amount must be a positive number' });
          continue;
        }

        const fyNormalized = normalizeFinancialYear(fyRaw);
        const monthNormalized = normalizeMonth(monthRaw);
        if (!fyNormalized || !monthNormalized) {
          rowErrors.push({
            row: rowNumber,
            message: 'financialYear and month are required and must be valid',
          });
          continue;
        }

        const transaction: any = {
          companyId: req.companyId,
          date: parsedDate,
          category: clean(get('category')) || 'Other',
          description: clean(get('description', 'narration', 'particulars')) || '',
          amount,
          branch: clean(get('branch')) || '',
          costCentre: clean(get('costcentre', 'cost_center', 'cost centre', 'costcenter')) || '',
          financialYear: fyNormalized,
          month: monthNormalized,
          createdBy: req.user!._id,
        };

        if (type === 'income') {
          transaction.category = normalizeIncomeCategory(transaction.category);
          transaction.gstApplicable = ['true', 'yes', '1'].includes(
            clean(get('gstapplicable', 'gst_applicable')).toLowerCase(),
          );
          transaction.gstRate = parseFloat(clean(get('gstrate', 'gst_rate'))) || 0;
          transaction.gstAmount = transaction.gstApplicable ? (transaction.amount * transaction.gstRate) / 100 : 0;
          transaction.totalWithGst = transaction.amount + transaction.gstAmount;
        } else {
          transaction.category = normalizeExpenseCategory(transaction.category);
          transaction.gstInput = ['true', 'yes', '1'].includes(
            clean(get('gstinput', 'gst_input')).toLowerCase(),
          );
          transaction.gstRate = parseFloat(clean(get('gstrate', 'gst_rate'))) || 0;
          transaction.gstAmount = transaction.gstInput ? (transaction.amount * transaction.gstRate) / 100 : 0;
          transaction.vendor = clean(get('vendor', 'party')) || '';
        }

        records.push(transaction);
      }

      if (records.length === 0) {
        return res.status(400).json({
          error: 'No valid rows to import.',
          rowErrors,
        });
      }

      const result =
        type === 'income'
          ? await IncomeTransaction.insertMany(records as any[])
          : await ExpenseTransaction.insertMany(records as any[]);

      const financialYears = [...new Set(records.map((r) => r.financialYear))];
      const months = [...new Set(records.map((r) => r.month))];

      return res.json({
        message: `Imported ${result.length} ${type} transactions`,
        count: result.length,
        financialYears,
        months,
        rowErrors: rowErrors.length ? rowErrors : undefined,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Import failed: ' + (error?.message || 'Unknown error') });
    } finally {
      try {
        if (fs && req.file?.path) {
          fs.unlinkSync(req.file.path);
        }
      } catch {
        // best-effort cleanup
      }
    }
  },
);

// POST import balance sheet CSV
router.post(
  '/balance-sheet',
  authMiddleware,
  rbac('super_admin', 'ca', 'finance_team'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    let fsLib: typeof import('fs') | null = null;
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      fsLib = await import('fs');
      const content = fsLib.readFileSync(req.file.path, 'utf-8');
      const lines = content.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      if (lines.length < 2) return res.status(400).json({ error: 'File must have header + data rows' });

      const splitCsv = (line: string) => {
        const out: string[] = []; let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; continue; }
          if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue; }
          cur += ch;
        }
        out.push(cur);
        return out.map((s: string) => s.trim());
      };

      const key = (h: string) => h.toLowerCase().replace(/[\s_-]+/g, '');
      const headers = splitCsv(lines[0]).map(key);
      const FY_MONTHS_BS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
      const monthMap: Record<string,string> = {
        apr:'Apr',april:'Apr','4':'Apr',may:'May','5':'May',jun:'Jun',june:'Jun','6':'Jun',
        jul:'Jul',july:'Jul','7':'Jul',aug:'Aug',august:'Aug','8':'Aug',sep:'Sep',sept:'Sep',
        september:'Sep','9':'Sep',oct:'Oct',october:'Oct','10':'Oct',nov:'Nov',november:'Nov',
        '11':'Nov',dec:'Dec',december:'Dec','12':'Dec',jan:'Jan',january:'Jan','1':'Jan',
        feb:'Feb',february:'Feb','2':'Feb',mar:'Mar',march:'Mar','3':'Mar',
      };

      const numFields = [
        'totalassets','currentassets','cashandequivalents','inventory','receivables','noncurrentassets',
        'totalliabilities','currentliabilities','payables','noncurrentliabilities','totaldebt',
        'shareholdersequity','retainedearnings','netrevenue','cogs','grossprofit','operatingexpenses',
        'ebit','interestexpense','depreciation','ebitda','netprofit','capitalemployed',
        'netcreditsales','netcreditpurchases',
      ];

      const records: any[] = [];
      const financialYear = req.body.financialYear || '';

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCsv(lines[i]);
        if (cols.every((v: string) => !v)) continue;
        const row: any = {};
        headers.forEach((h: string, idx: number) => { row[h] = cols[idx] || ''; });

        const monthRaw = (row['month'] || '').toLowerCase();
        const month = monthMap[monthRaw] || monthMap[monthRaw.replace(/^0+/,'')];
        if (!month || !FY_MONTHS_BS.includes(month)) continue;

        const fy = row['financialyear'] || row['fy'] || financialYear;
        const entry: any = { companyId: req.companyId, financialYear: fy, month, date: new Date() };
        numFields.forEach((f: string) => { entry[f] = parseFloat(row[f]) || 0; });
        records.push(entry);
      }

      if (!records.length) return res.status(400).json({ error: 'No valid rows found' });

      let upserted = 0;
      for (const r of records) {
        await BalanceSheetEntry.findOneAndUpdate(
          { companyId: r.companyId, financialYear: r.financialYear, month: r.month },
          r,
          { upsert: true }
        );
        upserted++;
      }

      return res.json({ message: `Imported ${upserted} balance sheet entries`, count: upserted });
    } catch (error: any) {
      return res.status(500).json({ error: 'Import failed: ' + (error?.message || 'Unknown error') });
    } finally {
      try { if (fsLib && req.file?.path) fsLib.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
  }
);

export default router;
