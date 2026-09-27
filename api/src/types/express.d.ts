import type { Account } from '../db/types.js';
import type { AuthClaims } from '../utils/supabaseToken.js';

// Adds `req.auth` and `req.account` (set by requireAuth) to Express's Request type everywhere.
declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
      account?: Account;
    }
  }
}

export {};
