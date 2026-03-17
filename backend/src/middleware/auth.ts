import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/User';
import { CompanyMembership } from '../models/CompanyMembership';

export interface AuthRequest extends Request {
  user?: IUser;
  companyId?: string;
  activeRole?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      role?: string;
      companyId?: string;
      activeCompanyId?: string;
      activeRole?: string;
    };
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const activeCompanyId = decoded.activeCompanyId || decoded.companyId || (user as any).companyId?.toString();
    if (!activeCompanyId) {
      return res.status(400).json({ error: 'Active company not set for this session' });
    }

    // Re-validate membership on every request to prevent stale-token privilege escalation
    const membership = await CompanyMembership.findOne({
      userId: user._id,
      companyId: activeCompanyId,
      status: 'active',
    });
    if (!membership) {
      return res.status(403).json({ error: 'No active membership for this company' });
    }

    req.user = user;
    req.companyId = activeCompanyId;
    req.activeRole = membership.role; // always from DB, never from token alone
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Checks req.activeRole (per-company membership role, set by authMiddleware)
export const rbac = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.activeRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.activeRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
