import type { db } from './client.js';
import type { accounts } from './schema.js';

export type Account = typeof accounts.$inferSelect;
export type StaffRole = NonNullable<Account['staffRole']>;

// Either the shared connection or an open transaction: services accept both so callers can group writes.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = typeof db | Tx;
