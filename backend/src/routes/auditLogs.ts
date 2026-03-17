import { Router, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', action, entity, search } = req.query;
    const filter: any = { companyId: req.companyId };
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (search) {
      const q = String(search);
      filter.$or = [
        { action: { $regex: q, $options: 'i' } },
        { entity: { $regex: q, $options: 'i' } },
        { details: { $regex: q, $options: 'i' } },
        { ipAddress: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
