import { Router, Response } from 'express';
import { Budget } from '../models/Budget';
import { ExpenseTransaction } from '../models/ExpenseTransaction';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';
import { getMonthsElapsed } from '../lib/formatINR';

const router = Router();

// GET all budgets
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const filter: any = { companyId: req.companyId };
    if (financialYear) filter.financialYear = financialYear;

    const budgets = await Budget.find(filter).populate('createdBy', 'name').populate('approvedBy', 'name');
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST create budget
router.post('/', authMiddleware, rbac('super_admin', 'ca', 'finance_team'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, companyId: req.companyId, createdBy: req.user!._id };
    const budget = await Budget.create(data);
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// PUT update budget
router.put('/:id', authMiddleware, rbac('super_admin', 'ca'), async (req: AuthRequest, res: Response) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// GET budget utilisation
router.get('/utilisation', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { financialYear } = req.query;
    const companyId = req.companyId;
    const monthsElapsed = getMonthsElapsed(financialYear as string);

    const [budgets, expenses] = await Promise.all([
      Budget.find({ companyId, financialYear }),
      ExpenseTransaction.aggregate([
        { $match: { companyId, financialYear } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);

    const expenseMap: Record<string, number> = {};
    expenses.forEach((e: any) => { expenseMap[e._id] = e.total; });

    // Frontend expects: `utilisations[]` with { category, budgeted, actuals, percUsed }
    // plus `overallTotals` with { totalBudget, totalUtilised, overallVariance }
    const budgetByCategory: Record<string, any> = {};
    budgets.forEach((b: any) => {
      budgetByCategory[b.category] = b;
    });

    const categories = Array.from(new Set([...Object.keys(budgetByCategory), ...Object.keys(expenseMap)])).sort();

    const utilisations = categories.map((category) => {
      const budget = budgetByCategory[category];
      const budgeted = budget?.annualBudget || 0;
      const actuals = expenseMap[category] || 0;
      const percUsed = budgeted > 0 ? (actuals / budgeted) * 100 : 0;
      return {
        category,
        budgeted,
        actuals,
        percUsed,
        status: budget?.status || (budgeted > 0 ? 'draft' : 'not_set'),
      };
    });

    const totalBudget = utilisations.reduce((s, u) => s + (u.budgeted || 0), 0);
    const totalUtilised = utilisations.reduce((s, u) => s + (u.actuals || 0), 0);
    const overallVariance = totalBudget - totalUtilised;

    res.json({
      utilisations,
      overallTotals: {
        totalBudget,
        totalUtilised,
        overallVariance,
      },
      monthsElapsed,
      // Backward-compatible keys (if any older UI still uses them)
      utilisation: utilisations,
      totals: {
        totalBudget,
        totalSpent: totalUtilised,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute budget utilisation' });
  }
});

export default router;
