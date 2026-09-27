import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { keyRules, type RuleSnapshot } from '../db/schema.js';
import type { Executor } from '../db/types.js';

export type Rule = typeof keyRules.$inferSelect;

export async function getNewAccountRule(): Promise<Rule | undefined> {
  const [rule] = await db.select().from(keyRules).where(eq(keyRules.type, 'new_account')).limit(1);
  return rule;
}

export async function getTier(id: string): Promise<Rule | undefined> {
  const [tier] = await db.select().from(keyRules).where(and(eq(keyRules.id, id), eq(keyRules.type, 'tier'))).limit(1);
  return tier;
}

export const listTiers = () => db.select().from(keyRules).where(eq(keyRules.type, 'tier')).orderBy(asc(keyRules.minUsd));

// Names of the active tiers whose range overlaps min–max (both ends inclusive; null max = no upper limit).
// The database refuses an overlap anyway; this is to tell the admin which tier it clashes with.
export async function overlappingTiers(dbx: Executor, minUsd: string, maxUsd: string | null, exceptId?: string): Promise<string[]> {
  const rows = await dbx
    .select({ name: keyRules.name })
    .from(keyRules)
    .where(
      and(
        eq(keyRules.type, 'tier'),
        eq(keyRules.active, true),
        exceptId ? ne(keyRules.id, exceptId) : undefined,
        sql`numrange("min_usd", "max_usd", '[]') && numrange(${minUsd}::numeric, ${maxUsd}::numeric, '[]')`,
      ),
    )
    .orderBy(asc(keyRules.minUsd));
  return rows.map((r) => r.name);
}

// Frozen into every key and donation, so editing a rule later never changes what was already issued.
export const snapshotOf = (r: Rule): RuleSnapshot => ({
  ruleId: r.id,
  type: r.type,
  name: r.name,
  minUsd: r.minUsd,
  maxUsd: r.maxUsd,
  goLives: r.goLives,
  minutesPerGoLive: r.minutesPerGoLive,
  expiryDays: r.expiryDays,
  features: r.features,
});

export const toRuleView = (r: Rule) => ({
  id: r.id,
  type: r.type,
  name: r.name,
  minUsd: r.minUsd,
  maxUsd: r.maxUsd,
  goLives: r.goLives,
  minutesPerGoLive: r.minutesPerGoLive,
  expiryDays: r.expiryDays,
  features: r.features,
  active: r.active,
  updatedAt: r.updatedAt,
});

// The limits an audit entry records for a rule change.
export const ruleLimits = (r: Rule) => ({
  name: r.name,
  minUsd: r.minUsd,
  maxUsd: r.maxUsd,
  goLives: r.goLives,
  minutesPerGoLive: r.minutesPerGoLive,
  expiryDays: r.expiryDays,
  features: r.features,
  active: r.active,
});
