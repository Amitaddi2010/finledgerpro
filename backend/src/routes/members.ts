import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { CompanyMembership } from '../models/CompanyMembership';
import { User } from '../models/User';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';

const router = Router();

// GET all members of active company
router.get('/', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const members = await CompanyMembership.find({ companyId: new mongoose.Types.ObjectId(req.companyId) })
      .populate<{ userId: { _id: string; name: string; email: string } | null }>('userId', 'name email')
      .sort({ createdAt: 1 });
    // Filter out memberships where the user was deleted
    const safe = members.filter(m => m.userId != null);
    res.json({ members: safe });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST invite: find user by email and add membership (or create invited record)
router.post('/invite', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'email and role required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No user found with that email. They must register first.' });

    const existing = await CompanyMembership.findOne({ userId: user._id, companyId: req.companyId });
    if (existing) {
      // Reactivate if suspended/invited
      existing.role = role;
      existing.status = 'active';
      await existing.save();
      return res.json({ message: 'Membership updated', membership: existing });
    }

    const membership = await CompanyMembership.create({
      userId: user._id,
      companyId: req.companyId,
      role,
      status: 'active',
    });
    res.status(201).json({ message: 'Member added', membership });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to invite' });
  }
});

// PATCH update role
router.patch('/:id/role', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const membership = await CompanyMembership.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    // Prevent self-demotion
    if (membership.userId.toString() === req.user!._id.toString()) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    membership.role = role;
    await membership.save();
    res.json({ membership });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// PATCH update status (active / suspended)
router.patch('/:id/status', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const membership = await CompanyMembership.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    // Prevent self-suspension
    if (membership.userId.toString() === req.user!._id.toString()) {
      return res.status(400).json({ error: 'You cannot suspend yourself' });
    }
    membership.status = status as any;
    await membership.save();
    res.json({ membership });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
