import type { RequestHandler } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { keys } from '../db/schema.js';
import { me } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { keyIssuedEmail } from '../services/emails.js';
import { accountKeys, CURRENT_STATUSES, expireOverdueKeys, issueKey, toKeyView } from '../services/keys.js';
import { sendMailInBackground } from '../services/mailer.js';
import { getNewAccountRule, snapshotOf } from '../services/rules.js';
import { AppError } from '../utils/AppError.js';
import { decryptSecret } from '../utils/crypto.js';

// GET /api/keys/current — the dashboard: the current key (or the last one), and which button to show.
export const getCurrentKey: RequestHandler = async (req, res) => {
  const account = me(req);
  await expireOverdueKeys(account.id);
  const [all, rule] = await Promise.all([accountKeys(account.id), getNewAccountRule()]);
  const current = all.find((k) => CURRENT_STATUSES.includes(k.status));
  const shown = current ?? all[0];

  res.json({
    success: true,
    data: {
      key: shown ? toKeyView(shown) : null,
      hasCurrentKey: Boolean(current),
      // "Get free key" only for accounts that never had a key; "Donate for a key" once they have.
      canGetFreeKey: all.length === 0 && Boolean(rule?.active),
      canDonate: all.length > 0 && !current,
    },
  });
};

// GET /api/keys — every key this account has had, newest first.
export const listKeys: RequestHandler = async (req, res) => {
  const all = await accountKeys(me(req).id);
  res.json({ success: true, data: { keys: all.map(toKeyView) } });
};

// POST /api/keys/free — the new-account key: once per account, ever. The full key is in this response
// (the only time it's shown on screen) and in the email; only its hash is stored.
export const postFreeKey: RequestHandler = async (req, res) => {
  const account = me(req);
  await expireOverdueKeys(account.id);

  const [hadKey] = await db.select({ id: keys.id }).from(keys).where(eq(keys.accountId, account.id)).limit(1);
  if (hadKey) throw new AppError(409, "You've already had a key. Donate to get a new one.", undefined, 'free_key_used');

  const rule = await getNewAccountRule();
  if (!rule?.active) throw new AppError(409, 'Free keys are paused right now. Please check back soon.', undefined, 'free_keys_paused');

  const { key, plaintext } = await db.transaction(async (tx) => {
    const issued = await issueKey(tx, { accountId: account.id, source: 'new_account', snapshot: snapshotOf(rule), revealNow: true });
    await audit(tx, {
      actor: account,
      action: 'key.issue',
      target: { type: 'key', id: issued.key.id },
      after: { source: 'new_account', accountId: account.id, goLives: issued.key.goLivesTotal, expiresAt: issued.key.expiresAt },
    });
    return issued;
  });

  if (account.email) {
    sendMailInBackground(keyIssuedEmail({ to: account.email, key: plaintext, goLives: key.goLivesTotal, minutesPerGoLive: key.minutesPerGoLive, expiresAt: key.expiresAt, features: key.features }));
  }
  res.status(201).json({ success: true, data: { key: toKeyView(key), fullKey: plaintext } });
};

// POST /api/keys/current/reveal — for keys issued while the owner wasn't looking (admin grants, donations):
// returns the full key once and deletes the stored copy in the same step.
export const revealCurrentKey: RequestHandler = async (req, res) => {
  const account = me(req);
  await expireOverdueKeys(account.id);

  const fullKey = await db.transaction(async (tx) => {
    const [key] = await tx
      .select()
      .from(keys)
      .where(and(eq(keys.accountId, account.id), inArray(keys.status, CURRENT_STATUSES)))
      .limit(1)
      .for('update'); // two reveal clicks at once: the second waits, then finds nothing left to show
    if (!key) throw new AppError(404, "You don't have a key in use.", undefined, 'no_current_key');
    if (!key.keyCiphertext) throw new AppError(410, 'This key has already been shown. Check your email for it.', undefined, 'already_revealed');

    await tx.update(keys).set({ keyCiphertext: null, revealedAt: new Date() }).where(eq(keys.id, key.id));
    return decryptSecret(key.keyCiphertext);
  });

  res.json({ success: true, data: { fullKey } });
};
