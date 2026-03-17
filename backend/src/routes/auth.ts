import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CompanyMembership } from '../models/CompanyMembership';
import { signAccessToken, signRefreshToken, buildUserResponse } from '../lib/authTokens';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Ensure legacy users have at least one membership
    if ((user as any).companyId) {
      await CompanyMembership.updateOne(
        { userId: user._id, companyId: (user as any).companyId },
        { $setOnInsert: { role: user.role, status: 'active' } },
        { upsert: true }
      );
      if (!(user as any).defaultCompanyId) {
        await User.updateOne({ _id: user._id }, { $set: { defaultCompanyId: (user as any).companyId } });
      }
    }

    const memberships = await CompanyMembership.find({ userId: user._id, status: 'active' }).sort({ createdAt: 1 });
    const activeCompanyId = (user as any).defaultCompanyId?.toString() || memberships[0]?.companyId?.toString() || (user as any).companyId?.toString();
    const activeMembership = memberships.find(m => m.companyId.toString() === activeCompanyId) || memberships[0];
    const activeRole = activeMembership?.role || user.role;

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      activeCompanyId,
      activeRole,
    });

    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({
      companyId: activeCompanyId,
      userId: user._id,
      action: 'login',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: buildUserResponse(user, activeCompanyId, activeRole),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, config.jwtRefreshSecret) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Keep existing active company from current access token if present, else default
    let activeCompanyId: string | undefined;
    const currentAccess = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (currentAccess) {
      try {
        const payload = jwt.verify(currentAccess, config.jwtSecret) as any;
        activeCompanyId = payload?.activeCompanyId || payload?.companyId;
      } catch {
        // ignore
      }
    }

    if (!activeCompanyId) {
      const memberships = await CompanyMembership.find({ userId: user._id, status: 'active' }).sort({ createdAt: 1 });
      activeCompanyId = (user as any).defaultCompanyId?.toString() || memberships[0]?.companyId?.toString() || (user as any).companyId?.toString();
    }

    const membership = activeCompanyId
      ? await CompanyMembership.findOne({ userId: user._id, companyId: activeCompanyId, status: 'active' })
      : null;
    const activeRole = membership?.role || user.role;

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      activeCompanyId: activeCompanyId!,
      activeRole,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ accessToken, user: buildUserResponse(user as any, activeCompanyId!, activeRole) });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' as const : 'lax' as const,
  };
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  if (req.user) {
    await AuditLog.create({
      companyId: req.companyId,
      userId: req.user._id,
      action: 'logout',
      entity: 'User',
      entityId: req.user._id,
    });
  }

  res.json({ message: 'Logged out' });
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!._id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.activeRole, // per-company membership role
      companyId: req.companyId,
      lastLogin: req.user!.lastLogin,
    },
  });
});

// Reset password (stub — logs OTP to console)
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If the email exists, a reset OTP has been sent.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[Password Reset OTP] Email: ${email}, OTP: ${otp}`);
    res.json({ message: 'If the email exists, a reset OTP has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process reset request' });
  }
});

export default router;
