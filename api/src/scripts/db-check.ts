import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

// Proves the database guard rails hold. Every write happens inside a transaction that is rolled back,
// so nothing is left behind. Prints "✓ label" / "✗ label" and ends with "N passed, M failed".
const runtimeUrl = process.env.DATABASE_URL;
const adminUrl = process.env.MIGRATION_DATABASE_URL;
if (!runtimeUrl || !adminUrl) {
  console.error('❌ DATABASE_URL and MIGRATION_DATABASE_URL must both be set');
  process.exit(1);
}

const api = postgres(runtimeUrl, { max: 1, onnotice: () => {} });
const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });

let pass = 0;
let fail = 0;
const ok = (c: boolean, label: string, extra = '') => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? '✓' : '✗'} ${label}${extra ? '  ' + extra : ''}`);
};

class Rollback extends Error {}

// Runs fn in a transaction that is always rolled back; returns the Postgres error code it failed with, if any.
async function attempt(db: postgres.Sql, fn: (tx: postgres.TransactionSql) => Promise<unknown>): Promise<string | null> {
  try {
    await db.begin(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
    return null;
  } catch (err) {
    if (err instanceof Rollback) return null;
    return (err as { code?: string }).code ?? 'unknown';
  }
}

const snapshot = { ruleId: randomUUID(), type: 'new_account', name: 'zz_test', minUsd: null, maxUsd: null, goLives: 1, minutesPerGoLive: 60, expiryDays: 30, features: { face: true, voice: true, voiceCloning: false } };

async function insertAccount(tx: postgres.TransactionSql) {
  const id = randomUUID();
  await tx`insert into surreal.accounts (id, email) values (${id}, ${`zz_${id.slice(0, 8)}@test.local`})`;
  return id;
}

async function insertKey(tx: postgres.TransactionSql, accountId: string, source: string, status = 'issued') {
  await tx`
    insert into surreal.keys (key_hash, key_last4, account_id, source, rule_snapshot, go_lives_total, minutes_per_go_live, features, status, expires_at)
    values (${randomUUID()}, 'ABCD', ${accountId}, ${source}, ${tx.json(snapshot)}, 1, 60, ${tx.json(snapshot.features)}, ${status}, now() + interval '30 days')`;
}

try {
  // ── Who can reach the schema ─────────────────────
  const [me] = await api`
    select current_user as user,
           pg_has_role(current_user, 'surreal_api', 'member') as member,
           has_schema_privilege('surreal', 'CREATE') as can_create,
           has_table_privilege('surreal.keys', 'DELETE') as can_delete_keys,
           has_table_privilege('surreal.audit_log', 'UPDATE') as can_update_audit`;
  ok(me.member, `API login (${me.user}) is a member of surreal_api`);
  ok(!me.can_create, 'API login cannot create or alter tables');
  ok(!me.can_delete_keys, 'API login cannot delete keys');
  ok(!me.can_update_audit, 'API login cannot edit the audit log');

  const [anon] = await admin`select exists (select 1 from pg_roles where rolname = 'anon') as present`;
  if (anon.present) {
    const [r] = await admin`select has_schema_privilege('anon', 'surreal', 'USAGE') as anon_usage, has_schema_privilege('authenticated', 'surreal', 'USAGE') as auth_usage`;
    ok(!r.anon_usage && !r.auth_usage, "Supabase's anon/authenticated roles cannot reach the surreal schema");
  }

  // ── Default rules ────────────────────────────────
  const rules = await api`select type, name, go_lives, minutes_per_go_live, expiry_days from surreal.key_rules where active order by min_usd nulls first`;
  const newAccount = rules.find((r) => r.type === 'new_account');
  ok(newAccount?.go_lives === 1 && newAccount?.minutes_per_go_live === 60 && newAccount?.expiry_days === 30, 'new-account rule seeded: 1 go-live, 60 min, 30 days');
  ok(rules.filter((r) => r.type === 'tier').map((r) => r.name).join(',') === 'Starter,Supporter,Champion', 'three example tiers seeded');

  // ── Tier ranges ──────────────────────────────────
  const overlap = await attempt(api, (tx) => tx`
    insert into surreal.key_rules (type, name, min_usd, max_usd, go_lives, minutes_per_go_live, expiry_days, features)
    values ('tier', 'zz_overlap', 8.00, 12.00, 1, 60, 30, ${tx.json(snapshot.features)})`);
  ok(overlap === '23P01', 'overlapping tier ($8–$12) → refused', `code=${overlap}`);

  const inactive = await attempt(api, (tx) => tx`
    insert into surreal.key_rules (type, name, min_usd, max_usd, go_lives, minutes_per_go_live, expiry_days, features, active)
    values ('tier', 'zz_inactive', 8.00, 12.00, 1, 60, 30, ${tx.json(snapshot.features)}, false)`);
  ok(inactive === null, 'an inactive tier may overlap (only active tiers are checked)', `code=${inactive}`);

  const second = await attempt(api, (tx) => tx`
    insert into surreal.key_rules (type, name, go_lives, minutes_per_go_live, expiry_days, features)
    values ('new_account', 'zz_second', 1, 60, 30, ${tx.json(snapshot.features)})`);
  ok(second === '23505', 'a second new-account rule → refused', `code=${second}`);

  const badRange = await attempt(api, (tx) => tx`
    insert into surreal.key_rules (type, name, min_usd, max_usd, go_lives, minutes_per_go_live, expiry_days, features)
    values ('tier', 'zz_backwards', 500.00, 400.00, 1, 60, 30, ${tx.json(snapshot.features)})`);
  ok(badRange === '23514', 'a tier whose max is below its min → refused', `code=${badRange}`);

  // ── Keys ─────────────────────────────────────────
  const twoCurrent = await attempt(api, async (tx) => {
    const acc = await insertAccount(tx);
    await insertKey(tx, acc, 'admin_grant');
    await insertKey(tx, acc, 'admin_grant');
  });
  ok(twoCurrent === '23505', 'two current keys on one account → refused', `code=${twoCurrent}`);

  const afterExhausted = await attempt(api, async (tx) => {
    const acc = await insertAccount(tx);
    await insertKey(tx, acc, 'admin_grant', 'exhausted');
    await insertKey(tx, acc, 'admin_grant');
  });
  ok(afterExhausted === null, 'a new key after the last one is exhausted → allowed', `code=${afterExhausted}`);

  const twoFree = await attempt(api, async (tx) => {
    const acc = await insertAccount(tx);
    await insertKey(tx, acc, 'new_account', 'revoked');
    await insertKey(tx, acc, 'new_account');
  });
  ok(twoFree === '23505', 'a second free key on one account, ever → refused', `code=${twoFree}`);

  // ── Audit log is append-only ─────────────────────
  const auditInsert = await attempt(api, (tx) => tx`
    insert into surreal.audit_log (actor_label, action, target_type) values ('zz_test', 'test.insert', 'test')`);
  ok(auditInsert === null, 'API login can add audit entries', `code=${auditInsert}`);

  const auditUpdate = await attempt(api, async (tx) => {
    const [row] = await tx`insert into surreal.audit_log (actor_label, action, target_type) values ('zz_test', 'test.update', 'test') returning id`;
    await tx`update surreal.audit_log set reason = 'changed' where id = ${row.id}`;
  });
  ok(auditUpdate === '42501', 'API login editing an audit entry → refused (no privilege)', `code=${auditUpdate}`);

  const adminUpdate = await attempt(admin, async (tx) => {
    const [row] = await tx`insert into surreal.audit_log (actor_label, action, target_type) values ('zz_test', 'test.admin', 'test') returning id`;
    await tx`delete from surreal.audit_log where id = ${row.id}`;
  });
  ok(adminUpdate === 'P0001', 'even the admin login deleting an audit entry → refused (trigger)', `code=${adminUpdate}`);
} catch (err) {
  fail++;
  console.log('✗ db-check crashed', err);
} finally {
  await api.end();
  await admin.end();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
