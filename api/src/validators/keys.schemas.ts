import { z } from 'zod';
import { featuresSchema, limits } from './rules.schemas.js';

// An admin grants a key to an account (reason required; support may only grant 1 go-live).
export const keyGrantSchema = z.object({
  accountId: z.uuid(),
  ...limits,
  features: featuresSchema,
  reason: z.string().trim().min(3, 'Give a short reason (at least 3 characters)').max(500),
});

export type KeyGrant = z.infer<typeof keyGrantSchema>;
