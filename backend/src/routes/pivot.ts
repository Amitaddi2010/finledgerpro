import { Router, Response } from 'express';
import { IncomeTransaction, ExpenseTransaction } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { FY_MONTHS } from '../lib/formatINR';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rows = 'category', cols = 'month', financialYear, transactionType = 'both', months, categories, branches, costCentres, aggregation = 'sum' } = req.query;
    const companyId = req.companyId;

    const matchFilter: any = { companyId };
    if (financialYear) matchFilter.financialYear = financialYear;
    if (months) matchFilter.month = { $in: (months as string).split(',') };
    if (categories) matchFilter.category = { $in: (categories as string).split(',') };
    if (branches) matchFilter.branch = { $in: (branches as string).split(',') };
    if (costCentres) matchFilter.costCentre = { $in: (costCentres as string).split(',') };

    let data: any[] = [];

    const fetchData = async (Model: any, type: string) => {
      const results = await Model.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { row: `$${rows}`, col: `$${cols}` },
            sum: { $sum: '$amount' },
            avg: { $avg: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);
      return results.map((r: any) => ({ ...r, type }));
    };

    if (transactionType === 'income' || transactionType === 'both') {
      data = data.concat(await fetchData(IncomeTransaction, 'income'));
    }
    if (transactionType === 'expense' || transactionType === 'both') {
      data = data.concat(await fetchData(ExpenseTransaction, 'expense'));
    }

    // Build pivot matrix
    const rowKeys = [...new Set(data.map((d: any) => d._id.row))].sort();
    const colKeys = cols === 'month' ? FY_MONTHS : [...new Set(data.map((d: any) => d._id.col))].sort();

    const agg = aggregation as string;
    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};

    rowKeys.forEach(rk => {
      matrix[rk as string] = {};
      rowTotals[rk as string] = 0;
      colKeys.forEach(ck => {
        matrix[rk as string][ck as string] = 0;
      });
    });
    colKeys.forEach(ck => { colTotals[ck as string] = 0; });

    data.forEach((d: any) => {
      const rk = d._id.row;
      const ck = d._id.col;
      if (matrix[rk] && ck) {
        const val = agg === 'avg' ? d.avg : agg === 'count' ? d.count : d.sum;
        matrix[rk][ck] = (matrix[rk][ck] || 0) + val;
        rowTotals[rk] = (rowTotals[rk] || 0) + val;
        colTotals[ck] = (colTotals[ck] || 0) + val;
      }
    });

    const grandTotal = Object.values(rowTotals).reduce((a, b) => a + b, 0);

    res.json({ matrix, rowKeys, colKeys, rowTotals, colTotals, grandTotal, aggregation: agg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate pivot data' });
  }
});

export default router;
