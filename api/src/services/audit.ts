import { auditLog } from '../db/schema.js';
import type { Account, Executor } from '../db/types.js';

export type AuditAction =
  | 'account.block'
  | 'account.unblock'
  | 'account.role'
  | 'account.make_owner'
  | 'key.issue'
  | 'key.grant'
  | 'rule.update'
  | 'tier.create'
  | 'tier.update';

type Entry = {
  actor: Account | null; // null = the system (scripts, scheduled jobs, IPN)
  actorLabel?: string; // overrides the label, e.g. "system (make-owner script)"
  action: AuditAction;
  target: { type: 'account' | 'key' | 'rule' | 'device' | 'transfer' | 'donation' | 'voice'; id: string };
  before?: unknown;
  after?: unknown;
  reason?: string | null;
};

// Appends one entry to the audit log. Pass the transaction the change ran in, so both land or neither does.
export async function audit(db: Executor, e: Entry): Promise<void> {
  await db.insert(auditLog).values({
    actorId: e.actor?.id ?? null,
    actorLabel: e.actorLabel ?? (e.actor ? (e.actor.email ?? e.actor.phone ?? e.actor.id) : 'system'),
    action: e.action,
    targetType: e.target.type,
    targetId: e.target.id,
    before: e.before ?? null,
    after: e.after ?? null,
    reason: e.reason ?? null,
  });
}
