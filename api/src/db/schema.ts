import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Everything lives in its own "surreal" schema. Supabase's public data API only exposes "public",
// so none of these tables can be reached with the anon key; only the API server (as surreal_api) uses them.
export const surreal = pgSchema('surreal');

// ── Shared column types ────────────────────────────
export type Features = { face: boolean; voice: boolean; voiceCloning: boolean };

// A frozen copy of the rule a key or donation came from: editing rules later never changes what was issued.
export type RuleSnapshot = {
  ruleId: string;
  type: 'new_account' | 'tier';
  name: string;
  minUsd: string | null;
  maxUsd: string | null;
  goLives: number;
  minutesPerGoLive: number;
  expiryDays: number;
  features: Features;
};

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ── Enums ──────────────────────────────────────────
export const accountStatus = surreal.enum('account_status', ['active', 'blocked']);
export const staffRole = surreal.enum('staff_role', ['support', 'admin', 'owner']);
export const deviceStatus = surreal.enum('device_status', ['active', 'blocked']);
export const keyStatus = surreal.enum('key_status', ['issued', 'active', 'exhausted', 'expired', 'revoked']);
export const keySource = surreal.enum('key_source', ['new_account', 'donation', 'admin_grant']);
export const ruleType = surreal.enum('rule_type', ['new_account', 'tier']);
export const donationStatus = surreal.enum('donation_status', ['pending', 'confirming', 'paid', 'underpaid', 'failed']);
export const transferStatus = surreal.enum('transfer_status', ['pending', 'approved', 'rejected']);
export const voiceStatus = surreal.enum('voice_status', ['processing', 'pending_verification', 'active', 'rejected', 'removed']);
export const feedbackKind = surreal.enum('feedback_kind', ['session', 'bug', 'suggestion']);

// ── Accounts ───────────────────────────────────────
// id is the Supabase Auth user id (set in Phase 2), so it has no default.
export const accounts = surreal.table(
  'accounts',
  {
    id: uuid('id').primaryKey(),
    email: text('email').unique(), // stored lowercase
    phone: text('phone').unique(),
    status: accountStatus('status').notNull().default('active'),
    statusReason: text('status_reason'),
    staffRole: staffRole('staff_role'), // null = a regular user
    // The one device this account's keys work on. Changed only by an approved device transfer.
    linkedDeviceId: uuid('linked_device_id')
      .unique()
      .references((): AnyPgColumn => devices.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [check('accounts_email_or_phone',sql`"email" is not null or "phone" is not null`)],
);

// ── Devices ────────────────────────────────────────
// A device belongs to one account forever. After a transfer the old device stays here, blocked.
export const devices = surreal.table(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceHash: text('device_hash').notNull().unique(), // HMAC-SHA256 of the app's hash, with our secret salt
    deviceCode: text('device_code').notNull(), // first 8 characters of device_hash, quoted to support
    accountId: uuid('account_id')
      .notNull()
      .references((): AnyPgColumn => accounts.id),
    status: deviceStatus('status').notNull().default('active'),
    blockedReason: text('blocked_reason'),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('devices_device_code_idx').on(t.deviceCode), index('devices_account_id_idx').on(t.accountId)],
);

// Every activation attempt, successful or not: rate limits (5 failed per device per hour), and resolving
// the device code a user types into a device-change request back to the full hash.
export const activationAttempts = surreal.table(
  'activation_attempts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    deviceHash: text('device_hash').notNull(),
    deviceCode: text('device_code').notNull(),
    keyId: uuid('key_id').references((): AnyPgColumn => keys.id),
    accountId: uuid('account_id').references(() => accounts.id), // the key's account, when the key was valid
    result: text('result').notNull(), // ok | invalid_key | device_taken | device_mismatch | key_expired | …
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activation_attempts_device_hash_at_idx').on(t.deviceHash, t.at),
    index('activation_attempts_device_code_idx').on(t.deviceCode),
  ],
);

// ── Key rules (new-account rule + donation tiers) ──
// Tier ranges may not overlap: enforced by an EXCLUDE constraint in migration 0001.
export const keyRules = surreal.table(
  'key_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: ruleType('type').notNull(),
    name: text('name').notNull(),
    minUsd: numeric('min_usd', { precision: 10, scale: 2 }),
    maxUsd: numeric('max_usd', { precision: 10, scale: 2 }), // null = no upper limit
    goLives: integer('go_lives').notNull(),
    minutesPerGoLive: integer('minutes_per_go_live').notNull(),
    expiryDays: integer('expiry_days').notNull(),
    features: jsonb('features').$type<Features>().notNull(),
    active: boolean('active').notNull().default(true),
    updatedBy: uuid('updated_by').references(() => accounts.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('key_rules_one_new_account_rule').on(t.type).where(sql`"type" = 'new_account'`),
    check('key_rules_positive_limits', sql`"go_lives" > 0 and "minutes_per_go_live" > 0 and "expiry_days" > 0`),
    check(
      'key_rules_amounts',
      sql`("type" = 'new_account' and "min_usd" is null and "max_usd" is null)
        or ("type" = 'tier' and "min_usd" > 0 and ("max_usd" is null or "max_usd" >= "min_usd"))`,
    ),
  ],
);

// ── Keys ───────────────────────────────────────────
export const keys = surreal.table(
  'keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keyHash: text('key_hash').notNull().unique(),
    keyLast4: text('key_last4').notNull(),
    // The full key, encrypted, kept only until the owner first sees it (keys issued by IPN have no one watching).
    keyCiphertext: text('key_ciphertext'),
    revealedAt: timestamp('revealed_at', { withTimezone: true }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    deviceId: uuid('device_id').references(() => devices.id), // set on activation
    source: keySource('source').notNull(),
    ruleId: uuid('rule_id').references(() => keyRules.id),
    ruleSnapshot: jsonb('rule_snapshot').$type<RuleSnapshot>().notNull(),
    goLivesTotal: integer('go_lives_total').notNull(),
    goLivesUsed: integer('go_lives_used').notNull().default(0),
    minutesPerGoLive: integer('minutes_per_go_live').notNull(),
    features: jsonb('features').$type<Features>().notNull(),
    status: keyStatus('status').notNull().default('issued'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
  },
  (t) => [
    // One current key per account: a new one only when the last is exhausted, expired or revoked.
    uniqueIndex('keys_one_current_per_account').on(t.accountId).where(sql`"status" in ('issued', 'active')`),
    // "Get free key" works once per account, ever.
    uniqueIndex('keys_one_free_key_per_account').on(t.accountId).where(sql`"source" = 'new_account'`),
    index('keys_device_id_idx').on(t.deviceId),
    check('keys_go_lives', sql`"go_lives_total" > 0 and "go_lives_used" >= 0 and "go_lives_used" <= "go_lives_total"`),
    check('keys_minutes', sql`"minutes_per_go_live" > 0`),
  ],
);

// ── Donations (NOWPayments) ────────────────────────
export const donations = surreal.table(
  'donations',
  {
    id: uuid('id').primaryKey().defaultRandom(), // sent to NOWPayments as order_id
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    ruleId: uuid('rule_id').references(() => keyRules.id),
    tierSnapshot: jsonb('tier_snapshot').$type<RuleSnapshot>().notNull(),
    npInvoiceId: text('np_invoice_id').unique(),
    npPaymentId: text('np_payment_id'),
    npStatus: text('np_status'),
    status: donationStatus('status').notNull().default('pending'),
    keyId: uuid('key_id')
      .unique() // one donation can never issue two keys
      .references(() => keys.id),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('donations_account_id_idx').on(t.accountId),
    index('donations_np_payment_id_idx').on(t.npPaymentId),
    check('donations_amount_positive', sql`"amount_usd" > 0`),
  ],
);

// Every IPN call we accepted (signature already verified). The unique pair makes duplicates harmless.
export const npIpnEvents = surreal.table(
  'np_ipn_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    donationId: uuid('donation_id').references(() => donations.id),
    npPaymentId: text('np_payment_id').notNull(),
    npStatus: text('np_status').notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('np_ipn_events_payment_status').on(t.npPaymentId, t.npStatus)],
);

// ── Voices ─────────────────────────────────────────
export const voices = surreal.table(
  'voices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerAccountId: uuid('owner_account_id').references(() => accounts.id), // null = stock voice
    name: text('name').notNull(),
    referenceFile: text('reference_file').notNull(), // storage path, encrypted at rest
    previewFile: text('preview_file'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    status: voiceStatus('status').notNull().default('processing'),
    createdAt: createdAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('voices_owner_account_id_idx').on(t.ownerAccountId)],
);

// ── Sessions (go-lives) ────────────────────────────
export const sessions = surreal.table(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keyId: uuid('key_id')
      .notNull()
      .references(() => keys.id),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    countedAt: timestamp('counted_at', { withTimezone: true }), // set after 10 continuous seconds: one go-live used
    endedAt: timestamp('ended_at', { withTimezone: true }),
    endReason: text('end_reason'), // stopped | time_cap | heartbeat_lost | ended_by_server | error …
    voiceEnabled: boolean('voice_enabled').notNull().default(false),
    voiceId: uuid('voice_id').references(() => voices.id),
    voicePod: text('voice_pod'),
    voiceSeconds: integer('voice_seconds').notNull().default(0),
    avgFps: real('avg_fps'),
    avgVoiceDelayMs: integer('avg_voice_delay_ms'),
    appVersion: text('app_version'),
    gpuModel: text('gpu_model'),
  },
  (t) => [
    // Only one live session per key at a time.
    uniqueIndex('sessions_one_open_per_key').on(t.keyId).where(sql`"ended_at" is null`),
    index('sessions_device_started_idx').on(t.deviceId, t.startedAt), // sub-10-second start flags
    index('sessions_started_at_idx').on(t.startedAt),
  ],
);

// ── Device transfers ───────────────────────────────
export const deviceTransfers = surreal.table(
  'device_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    oldDeviceId: uuid('old_device_id').references(() => devices.id),
    newDeviceCode: text('new_device_code').notNull(), // what the user typed, from the app's screen
    newDeviceHash: text('new_device_hash'), // resolved from activation_attempts when an admin decides
    proofFiles: jsonb('proof_files').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    proofPurgedAt: timestamp('proof_purged_at', { withTimezone: true }), // proof deleted 90 days after the decision
    explanation: text('explanation').notNull(),
    status: transferStatus('status').notNull().default('pending'),
    decidedBy: uuid('decided_by').references(() => accounts.id),
    reason: text('reason'),
    reboundKeyId: uuid('rebound_key_id').references(() => keys.id),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [index('device_transfers_account_id_idx').on(t.accountId), index('device_transfers_status_idx').on(t.status)],
);

// Transfer entries are never edited or deleted, only annotated (append-only, see migration 0001).
export const deviceTransferNotes = surreal.table(
  'device_transfer_notes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    transferId: uuid('transfer_id')
      .notNull()
      .references(() => deviceTransfers.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => accounts.id),
    note: text('note').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('device_transfer_notes_transfer_id_idx').on(t.transferId)],
);

// ── Feedback ───────────────────────────────────────
export const feedback = surreal.table(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: feedbackKind('kind').notNull(),
    sessionId: uuid('session_id').references(() => sessions.id),
    accountId: uuid('account_id').references(() => accounts.id),
    rating: smallint('rating'),
    worked: text('worked'),
    didntWork: text('didnt_work'),
    comment: text('comment'),
    appVersion: text('app_version'),
    gpuModel: text('gpu_model'),
    createdAt: createdAt(),
  },
  (t) => [
    check('feedback_rating_range', sql`"rating" is null or "rating" between 1 and 5`),
    check('feedback_session_rated', sql`"kind" <> 'session' or ("session_id" is not null and "rating" is not null)`),
    index('feedback_created_at_idx').on(t.createdAt),
  ],
);

// ── Audit log (append-only, see migration 0001) ────
export const auditLog = surreal.table(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid('actor_id'), // null = the system; no foreign key so the log never depends on other rows
    actorLabel: text('actor_label').notNull(), // e.g. the admin's email at the time, or "system"
    action: text('action').notNull(), // e.g. key.revoke, tier.update, transfer.approve
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    reason: text('reason'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_target_idx').on(t.targetType, t.targetId), index('audit_log_at_idx').on(t.at)],
);
