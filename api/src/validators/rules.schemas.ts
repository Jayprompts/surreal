import { z } from 'zod';

// USD amounts: a number or string with at most 2 decimals, stored as "9.99".
const money = z
  .union([z.number(), z.string()])
  .transform(String)
  .pipe(z.string().trim().regex(/^\d{1,8}(\.\d{1,2})?$/, 'Use an amount like 9.99'))
  .transform((v) => Number(v).toFixed(2))
  .refine((v) => Number(v) > 0, 'Must be more than 0');

export const featuresSchema = z
  .object({ face: z.boolean(), voice: z.boolean(), voiceCloning: z.boolean() })
  .refine((f) => !f.voiceCloning || f.voice, { path: ['voiceCloning'], message: 'Voice cloning needs voice turned on' })
  .refine((f) => f.face || f.voice, { path: ['face'], message: 'Turn on face or voice' });

export const limits = {
  goLives: z.number().int().min(1).max(1000),
  minutesPerGoLive: z.number().int().min(1).max(600),
  expiryDays: z.number().int().min(1).max(3650),
};

const reason = z.string().trim().min(3, 'Give a short reason (at least 3 characters)').max(500);
const atLeastOne = (d: Record<string, unknown>) => Object.keys(d).some((k) => k !== 'reason' && d[k] !== undefined);

export const newAccountRulePatchSchema = z
  .object({
    goLives: limits.goLives.optional(),
    minutesPerGoLive: limits.minutesPerGoLive.optional(),
    expiryDays: limits.expiryDays.optional(),
    features: featuresSchema.optional(),
    active: z.boolean().optional(), // off = "Get free key" paused
    reason: reason.optional(),
  })
  .refine(atLeastOne, 'Nothing to change');

export const tierCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    minUsd: money,
    maxUsd: money.nullable(), // null = no upper limit (top tier)
    ...limits,
    features: featuresSchema,
    active: z.boolean().default(true),
    reason: reason.optional(),
  })
  .refine((t) => t.maxUsd === null || Number(t.maxUsd) >= Number(t.minUsd), { path: ['maxUsd'], message: 'Maximum must be at least the minimum' });

export const tierPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    minUsd: money.optional(),
    maxUsd: money.nullable().optional(),
    goLives: limits.goLives.optional(),
    minutesPerGoLive: limits.minutesPerGoLive.optional(),
    expiryDays: limits.expiryDays.optional(),
    features: featuresSchema.optional(),
    active: z.boolean().optional(),
    reason: reason.optional(),
  })
  .refine(atLeastOne, 'Nothing to change');

export type NewAccountRulePatch = z.infer<typeof newAccountRulePatchSchema>;
export type TierCreate = z.infer<typeof tierCreateSchema>;
export type TierPatch = z.infer<typeof tierPatchSchema>;
