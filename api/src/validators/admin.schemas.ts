import { z } from 'zod';

const reason = z.string().trim().min(3, 'Give a short reason (at least 3 characters)').max(500);

// Blocking needs a reason (it's shown to the user and kept in the audit log); unblocking may add one.
export const accountStatusSchema = z
  .object({
    status: z.enum(['active', 'blocked']),
    reason: reason.optional(),
  })
  .refine((d) => d.status === 'active' || d.reason, { path: ['reason'], message: 'Give a reason for blocking' });

export const accountRoleSchema = z.object({
  staffRole: z.enum(['support', 'admin', 'owner']).nullable(),
  reason: reason.optional(),
});

export type AccountStatusInput = z.infer<typeof accountStatusSchema>;
export type AccountRoleInput = z.infer<typeof accountRoleSchema>;
