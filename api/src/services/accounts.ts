import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accounts } from '../db/schema.js';
import type { Account } from '../db/types.js';
import type { AuthClaims } from '../utils/supabaseToken.js';
import { AppError } from '../utils/AppError.js';

export async function findAccount(id: string): Promise<Account | undefined> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return account;
}

// The account row is created the first time a verified Supabase user calls the API.
// Its id is the Supabase user id; the verified email (or phone) is copied in.
export async function getOrCreateAccount(claims: AuthClaims): Promise<Account> {
  const existing = await findAccount(claims.userId);
  if (existing) return existing;

  if (!claims.email && !claims.phone) throw new AppError(403, 'Your sign-in has no verified email or phone.');

  // Two first requests can arrive together: whoever loses the race just reads the row the other created.
  await db.insert(accounts).values({ id: claims.userId, email: claims.email, phone: claims.phone }).onConflictDoNothing();
  const created = await findAccount(claims.userId);

  // The email already belongs to a different account row (e.g. a Supabase user deleted and re-created).
  if (!created) throw new AppError(409, 'This email is linked to another account. Contact support.', undefined, 'account_conflict');
  return created;
}

// What the website and admin see about an account.
export const toAccountView = (a: Account) => ({
  id: a.id,
  email: a.email,
  phone: a.phone,
  status: a.status,
  statusReason: a.statusReason,
  staffRole: a.staffRole,
  hasLinkedDevice: a.linkedDeviceId !== null,
  createdAt: a.createdAt,
});
