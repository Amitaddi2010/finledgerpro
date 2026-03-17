import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import type { IUser } from '../models/User';

export type TokenPayload = {
  userId: string;
  activeCompanyId: string;
  activeRole: string;
};

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiry as unknown as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: { userId: string }) {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry as unknown as SignOptions['expiresIn'],
  });
}

export function buildUserResponse(user: IUser, activeCompanyId: string, activeRole: string) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: activeRole,
    companyId: activeCompanyId,
    lastLogin: user.lastLogin,
  };
}

