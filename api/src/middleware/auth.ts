import type { Request, RequestHandler } from 'express';
import type { Account, StaffRole } from '../db/types.js';
import { getOrCreateAccount } from '../services/accounts.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken, type AuthClaims } from '../utils/supabaseToken.js';

// The website sends the Supabase access token as "Authorization: Bearer <token>".
function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

// Verifies the token, loads (or creates) the account, and refuses blocked accounts on every request,
// so blocking takes effect immediately even though the Supabase session is still valid.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) throw new AppError(401, 'Sign in to continue', undefined, 'unauthenticated');

  const claims = await verifyAccessToken(token);
  const account = await getOrCreateAccount(claims);

  if (account.status === 'blocked') {
    const reason = account.statusReason ? `: ${account.statusReason}` : '.';
    throw new AppError(403, `Your account is blocked${reason}`, undefined, 'account_blocked');
  }

  req.auth = claims;
  req.account = account;
  next();
};

const RANK: Record<StaffRole, number> = { support: 1, admin: 2, owner: 3 };

export const hasRole = (account: Account, min: StaffRole) => account.staffRole !== null && RANK[account.staffRole] >= RANK[min];

// Staff routes: the right role AND a second factor in this session. Non-staff get a plain 403
// before the two-factor check, so the admin area reveals nothing to them.
export const requireStaff =
  (min: StaffRole): RequestHandler =>
  (req, _res, next) => {
    if (!hasRole(me(req), min)) throw new AppError(403, "You don't have permission to do that.", undefined, 'forbidden');
    if (auth(req).aal !== 'aal2') {
      throw new AppError(403, 'Confirm your two-factor code to use the admin area.', undefined, 'mfa_required');
    }
    next();
  };

// For handlers behind requireAuth: the signed-in account and its token claims.
export function me(req: Request): Account {
  if (!req.account) throw new AppError(401, 'Sign in to continue', undefined, 'unauthenticated');
  return req.account;
}

export function auth(req: Request): AuthClaims {
  if (!req.auth) throw new AppError(401, 'Sign in to continue', undefined, 'unauthenticated');
  return req.auth;
}
