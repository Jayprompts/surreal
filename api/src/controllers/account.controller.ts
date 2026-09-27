import type { RequestHandler } from 'express';
import { auth, me } from '../middleware/auth.js';
import { toAccountView } from '../services/accounts.js';

// GET /api/me — the signed-in account (created on the first call after sign-in).
export const getMe: RequestHandler = (req, res) => {
  res.json({ success: true, data: { account: toAccountView(me(req)), session: { aal: auth(req).aal } } });
};
