import type { RequestHandler } from 'express';
import { db } from '../db/client.js';
import { me } from '../middleware/auth.js';
import { findAccount } from '../services/accounts.js';
import { audit } from '../services/audit.js';
import { keyIssuedEmail } from '../services/emails.js';
import { expireOverdueKeys, grantSnapshot, issueKey, toKeyView } from '../services/keys.js';
import { sendMailInBackground } from '../services/mailer.js';
import { AppError } from '../utils/AppError.js';
import type { KeyGrant } from '../validators/keys.schemas.js';

// POST /api/admin/keys — grant a key to an account (support: 1 go-live only; admin: any).
// Staff never see the full key: it's emailed to the owner and kept encrypted for their one-time reveal.
export const grantKey: RequestHandler = async (req, res) => {
  const actor = me(req);
  const { accountId, reason, ...limits } = req.body as KeyGrant;

  if (actor.staffRole === 'support' && limits.goLives !== 1) {
    throw new AppError(403, 'Support can grant keys of 1 go-live only.', undefined, 'forbidden');
  }
  const target = await findAccount(accountId);
  if (!target) throw new AppError(404, 'Account not found');
  if (target.status === 'blocked') throw new AppError(409, 'This account is blocked. Unblock it before granting a key.');

  await expireOverdueKeys(target.id);
  const { key, plaintext } = await db.transaction(async (tx) => {
    const issued = await issueKey(tx, { accountId: target.id, source: 'admin_grant', snapshot: grantSnapshot(limits), revealNow: false });
    await audit(tx, {
      actor,
      action: 'key.grant',
      target: { type: 'key', id: issued.key.id },
      after: { accountId: target.id, ...limits, expiresAt: issued.key.expiresAt },
      reason,
    });
    return issued;
  });

  if (target.email) {
    sendMailInBackground(keyIssuedEmail({ to: target.email, key: plaintext, goLives: key.goLivesTotal, minutesPerGoLive: key.minutesPerGoLive, expiresAt: key.expiresAt, features: key.features }));
  }
  res.status(201).json({ success: true, data: { key: toKeyView(key) } });
};
