import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accounts } from '../db/schema.js';
import type { Account } from '../db/types.js';
import { me } from '../middleware/auth.js';
import { uuidParam } from '../middleware/validate.js';
import { findAccount, toAccountView } from '../services/accounts.js';
import { audit } from '../services/audit.js';
import { AppError } from '../utils/AppError.js';
import type { AccountRoleInput, AccountStatusInput } from '../validators/admin.schemas.js';

async function loadTarget(id: unknown): Promise<Account> {
  const account = await findAccount(uuidParam(id, 'account id'));
  if (!account) throw new AppError(404, 'Account not found');
  return account;
}

// GET /api/admin/accounts/:id — support and above.
export const getAccount: RequestHandler = async (req, res) => {
  const account = await loadTarget(req.params.id);
  res.json({ success: true, data: { account: toAccountView(account) } });
};

// PATCH /api/admin/accounts/:id/status — admin and above. Blocking a staff member needs the owner.
export const setAccountStatus: RequestHandler = async (req, res) => {
  const actor = me(req);
  const target = await loadTarget(req.params.id);
  const { status, reason } = req.body as AccountStatusInput;

  if (target.id === actor.id) throw new AppError(403, "You can't block or unblock your own account.");
  if (target.staffRole && actor.staffRole !== 'owner') throw new AppError(403, 'Only the owner can block or unblock staff.');

  const statusReason = status === 'blocked' ? (reason ?? null) : null;
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx.update(accounts).set({ status, statusReason }).where(eq(accounts.id, target.id)).returning();
    await audit(tx, {
      actor,
      action: status === 'blocked' ? 'account.block' : 'account.unblock',
      target: { type: 'account', id: target.id },
      before: { status: target.status, statusReason: target.statusReason },
      after: { status, statusReason },
      reason,
    });
    return row;
  });

  res.json({ success: true, data: { account: toAccountView(updated) } });
};

// PATCH /api/admin/accounts/:id/role — owner only. Nobody changes their own role, so there's always an owner.
export const setAccountRole: RequestHandler = async (req, res) => {
  const actor = me(req);
  const target = await loadTarget(req.params.id);
  const { staffRole, reason } = req.body as AccountRoleInput;

  if (target.id === actor.id) throw new AppError(403, "You can't change your own role.");
  if (target.status === 'blocked' && staffRole) throw new AppError(409, 'Unblock this account before giving it a staff role.');

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx.update(accounts).set({ staffRole }).where(eq(accounts.id, target.id)).returning();
    await audit(tx, {
      actor,
      action: 'account.role',
      target: { type: 'account', id: target.id },
      before: { staffRole: target.staffRole },
      after: { staffRole },
      reason,
    });
    return row;
  });

  res.json({ success: true, data: { account: toAccountView(updated) } });
};
