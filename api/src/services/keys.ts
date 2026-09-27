import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { generateKey, maskKey } from '@surreal/shared';
import { db } from '../db/client.js';
import { keys, type Features, type RuleSnapshot } from '../db/schema.js';
import type { Executor } from '../db/types.js';
import { AppError } from '../utils/AppError.js';
import { encryptSecret, hashKey } from '../utils/crypto.js';
import { pgError } from '../utils/pgError.js';

export type Key = typeof keys.$inferSelect;

// "Current" = the one key an account may hold at a time (the database allows only one).
export const CURRENT_STATUSES: Key['status'][] = ['issued', 'active'];

const DAY_MS = 24 * 60 * 60 * 1000;

// Marks keys past their expiry date as expired: for one account (before any decision about its keys),
// or for everyone (the scheduled sweep). Returns how many changed.
export async function expireOverdueKeys(accountId?: string): Promise<number> {
  const rows = await db
    .update(keys)
    .set({ status: 'expired' })
    .where(
      and(
        inArray(keys.status, CURRENT_STATUSES),
        lte(keys.expiresAt, new Date()),
        accountId ? eq(keys.accountId, accountId) : undefined,
      ),
    )
    .returning({ id: keys.id });
  return rows.length;
}

export async function currentKey(dbx: Executor, accountId: string): Promise<Key | undefined> {
  const [key] = await dbx
    .select()
    .from(keys)
    .where(and(eq(keys.accountId, accountId), inArray(keys.status, CURRENT_STATUSES)))
    .limit(1);
  return key;
}

export const accountKeys = (accountId: string) =>
  db.select().from(keys).where(eq(keys.accountId, accountId)).orderBy(desc(keys.issuedAt));

type IssueInput = {
  accountId: string;
  source: Key['source'];
  snapshot: RuleSnapshot;
  // true: the owner is looking at the screen and sees the key in this response, so no copy is kept.
  // false (admin grants, donations): the full key is kept encrypted until the owner reveals it once.
  revealNow: boolean;
};

// Creates a key from a rule snapshot. Run inside the caller's transaction (with its audit entry).
export async function issueKey(tx: Executor, input: IssueInput): Promise<{ key: Key; plaintext: string }> {
  for (let attempt = 0; ; attempt++) {
    const plaintext = generateKey((n) => randomBytes(n));
    try {
      // A savepoint, so a failed insert can be retried without aborting the caller's transaction.
      const [key] = await tx.transaction((sp) =>
        sp
          .insert(keys)
          .values({
            keyHash: hashKey(plaintext),
            keyLast4: plaintext.slice(-4),
            keyCiphertext: input.revealNow ? null : encryptSecret(plaintext),
            revealedAt: input.revealNow ? new Date() : null,
            accountId: input.accountId,
            source: input.source,
            ruleId: input.snapshot.ruleId,
            ruleSnapshot: input.snapshot,
            goLivesTotal: input.snapshot.goLives,
            minutesPerGoLive: input.snapshot.minutesPerGoLive,
            features: input.snapshot.features,
            expiresAt: new Date(Date.now() + input.snapshot.expiryDays * DAY_MS),
          })
          .returning(),
      );
      return { key: key!, plaintext };
    } catch (err) {
      const pg = pgError(err);
      // Two random keys colliding is astronomically unlikely; if it ever happens, draw again.
      if (pg?.constraint === 'keys_key_hash_unique' && attempt < 2) continue;
      if (pg?.constraint === 'keys_one_current_per_account') {
        throw new AppError(409, 'This account already has a key in use. A new key can be issued once it is used up, expired or revoked.', undefined, 'has_current_key');
      }
      if (pg?.constraint === 'keys_one_free_key_per_account') {
        throw new AppError(409, 'The free key has already been used on this account.', undefined, 'free_key_used');
      }
      throw err;
    }
  }
}

export const grantSnapshot = (limits: { goLives: number; minutesPerGoLive: number; expiryDays: number; features: Features }): RuleSnapshot => ({
  ruleId: null,
  type: 'admin_grant',
  name: 'Admin grant',
  minUsd: null,
  maxUsd: null,
  ...limits,
});

// What the owner sees about a key: never the full text (that's only the one-time reveal).
export const toKeyView = (k: Key) => ({
  id: k.id,
  masked: maskKey(k.keyLast4),
  last4: k.keyLast4,
  status: k.status,
  source: k.source,
  goLivesTotal: k.goLivesTotal,
  goLivesUsed: k.goLivesUsed,
  goLivesLeft: k.goLivesTotal - k.goLivesUsed,
  minutesPerGoLive: k.minutesPerGoLive,
  features: k.features,
  issuedAt: k.issuedAt,
  activatedAt: k.activatedAt,
  expiresAt: k.expiresAt,
  revealable: k.keyCiphertext !== null,
  linkedToDevice: k.deviceId !== null,
});
