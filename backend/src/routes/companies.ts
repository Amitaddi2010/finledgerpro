import { Router, Request, Response } from 'express';
import { Company } from '../models/Company';
import { CompanyMembership } from '../models/CompanyMembership';
import { authMiddleware, AuthRequest, rbac } from '../middleware/auth';
import { signAccessToken, buildUserResponse } from '../lib/authTokens';
import { User } from '../models/User';
import { config } from '../config';

const router = Router();

// Get active company details
router.get('/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ company });
});

// Update active company details (super_admin only for that company)
router.put('/active', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.companyId },
      {
        name: req.body.name,
        gstin: req.body.gstin,
        pan: req.body.pan,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        financialYearStart: req.body.financialYearStart,
      },
      { new: true }
    );
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update company' });
  }
});

// List companies current user can access
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const memberships = await CompanyMembership.find({ userId: req.user!._id, status: 'active' }).populate('companyId');
  const companies = memberships
    .filter((m: any) => m.companyId != null)
    .map((m: any) => ({
      id: m.companyId._id,
      name: m.companyId.name,
      gstin: m.companyId.gstin,
      pan: m.companyId.pan,
      city: m.companyId.city,
      state: m.companyId.state,
      role: m.role,
    }));
  res.json({ companies, activeCompanyId: req.companyId, activeRole: req.activeRole });
});

// Create a company (super_admin only) and attach creator as super_admin
router.post('/', authMiddleware, rbac('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.create(req.body);
    await CompanyMembership.create({
      userId: req.user!._id,
      companyId: company._id,
      role: 'super_admin',
      status: 'active',
    });

    // Optionally set as default company
    await User.findByIdAndUpdate(req.user!._id, { defaultCompanyId: company._id }, { new: true });

    res.status(201).json({ company });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create company' });
  }
});

// Switch active company: issues a new access token (keeps refresh token)
router.post('/:id/switch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.id;
    const membership = await CompanyMembership.findOne({ userId: req.user!._id, companyId, status: 'active' });
    if (!membership) {
      return res.status(403).json({ error: 'No access to this company' });
    }

    const accessToken = signAccessToken({
      userId: req.user!._id.toString(),
      activeCompanyId: companyId,
      activeRole: membership.role,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      user: buildUserResponse(req.user!, companyId, membership.role),
      accessToken,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to switch company' });
  }
});

export default router;

