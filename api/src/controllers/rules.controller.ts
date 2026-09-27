import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { keyRules } from '../db/schema.js';
import { me } from '../middleware/auth.js';
import { uuidParam } from '../middleware/validate.js';
import { audit } from '../services/audit.js';
import { getNewAccountRule, getTier, listTiers, overlappingTiers, ruleLimits, toRuleView } from '../services/rules.js';
import { AppError } from '../utils/AppError.js';
import type { NewAccountRulePatch, TierCreate, TierPatch } from '../validators/rules.schemas.js';

const clash = (names: string[]) =>
  new AppError(409, `This range overlaps the active tier${names.length > 1 ? 's' : ''} ${names.join(', ')}.`, { clashesWith: names }, 'tier_overlap');

// GET /api/admin/rules — the new-account rule and every donation tier (support and above).
export const getRules: RequestHandler = async (_req, res) => {
  const [rule, tiers] = await Promise.all([getNewAccountRule(), listTiers()]);
  res.json({ success: true, data: { newAccount: rule ? toRuleView(rule) : null, tiers: tiers.map(toRuleView) } });
};

// PATCH /api/admin/rules/new-account — affects keys issued from now on; issued keys keep their snapshot.
export const patchNewAccountRule: RequestHandler = async (req, res) => {
  const actor = me(req);
  const { reason, ...changes } = req.body as NewAccountRulePatch;
  const rule = await getNewAccountRule();
  if (!rule) throw new AppError(404, 'The new-account rule is missing. Run the migrations.');

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx.update(keyRules).set({ ...changes, updatedBy: actor.id }).where(eq(keyRules.id, rule.id)).returning();
    await audit(tx, { actor, action: 'rule.update', target: { type: 'rule', id: rule.id }, before: ruleLimits(rule), after: ruleLimits(row!), reason });
    return row!;
  });
  res.json({ success: true, data: { rule: toRuleView(updated) } });
};

// POST /api/admin/tiers — ranges of active tiers may not overlap (checked here to name the clash,
// and by the database's EXCLUDE constraint as the final guard).
export const createTier: RequestHandler = async (req, res) => {
  const actor = me(req);
  const { reason, ...tier } = req.body as TierCreate;

  const created = await db.transaction(async (tx) => {
    if (tier.active) {
      const names = await overlappingTiers(tx, tier.minUsd, tier.maxUsd);
      if (names.length) throw clash(names);
    }
    const [row] = await tx.insert(keyRules).values({ ...tier, type: 'tier', updatedBy: actor.id }).returning();
    await audit(tx, { actor, action: 'tier.create', target: { type: 'rule', id: row!.id }, after: ruleLimits(row!), reason });
    return row!;
  });
  res.status(201).json({ success: true, data: { tier: toRuleView(created) } });
};

// PATCH /api/admin/tiers/:id — edits (including activate/deactivate). Issued keys and open invoices keep their snapshot.
export const patchTier: RequestHandler = async (req, res) => {
  const actor = me(req);
  const tier = await getTier(uuidParam(req.params.id, 'tier id'));
  if (!tier) throw new AppError(404, 'Tier not found');
  const { reason, ...changes } = req.body as TierPatch;

  const next = { ...tier, ...changes };
  if (next.maxUsd !== null && Number(next.maxUsd) < Number(next.minUsd)) {
    throw new AppError(400, 'Validation failed', { maxUsd: ['Maximum must be at least the minimum'] });
  }

  const updated = await db.transaction(async (tx) => {
    if (next.active) {
      const names = await overlappingTiers(tx, next.minUsd!, next.maxUsd, tier.id);
      if (names.length) throw clash(names);
    }
    const [row] = await tx.update(keyRules).set({ ...changes, updatedBy: actor.id }).where(eq(keyRules.id, tier.id)).returning();
    await audit(tx, { actor, action: 'tier.update', target: { type: 'rule', id: tier.id }, before: ruleLimits(tier), after: ruleLimits(row!), reason });
    return row!;
  });
  res.json({ success: true, data: { tier: toRuleView(updated) } });
};
