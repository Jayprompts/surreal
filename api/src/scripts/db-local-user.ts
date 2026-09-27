import postgres from 'postgres';

// Creates (or updates) the API's login from DATABASE_URL as a member of the least-privilege surreal_api role.
// Local and CI databases only: production logins are created by hand in Supabase (Phase 4.5).
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

const runtimeUrl = process.env.DATABASE_URL;
const adminUrl = process.env.MIGRATION_DATABASE_URL;
if (!runtimeUrl || !adminUrl) {
  console.error('❌ DATABASE_URL and MIGRATION_DATABASE_URL must both be set');
  process.exit(1);
}

const runtime = new URL(runtimeUrl);
if (!LOCAL_HOSTS.includes(runtime.hostname) || !LOCAL_HOSTS.includes(new URL(adminUrl).hostname)) {
  console.error('❌ Refusing to run: this script is for a local database only');
  process.exit(1);
}

const user = decodeURIComponent(runtime.username);
const password = decodeURIComponent(runtime.password);
if (!/^[a-z_][a-z0-9_]*$/.test(user) || !password) {
  console.error('❌ DATABASE_URL needs a lowercase user name and a password');
  process.exit(1);
}

const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
const quotedPassword = `'${password.replaceAll("'", "''")}'`;

try {
  const [existing] = await sql`select 1 from pg_roles where rolname = ${user}`;
  if (existing) await sql.unsafe(`alter role ${user} login password ${quotedPassword}`);
  else await sql.unsafe(`create role ${user} login password ${quotedPassword}`);
  await sql.unsafe(`grant surreal_api to ${user}`);
  console.log(`✅ ${user} can log in with the surreal_api privileges`);
} catch (err) {
  console.error('❌ Could not create the login (have migrations run?):', err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
