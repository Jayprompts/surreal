import path from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Applies pending migrations from api/drizzle/. Runs as the admin (migration) login, never the API's own login.
// From src/scripts (dev) or dist/scripts (prod), ../../drizzle is api/drizzle.
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('❌ MIGRATION_DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await migrate(drizzle(sql), { migrationsFolder: path.resolve(import.meta.dirname, '../../drizzle') });
  console.log('✅ Migrations applied');
} catch (err) {
  console.error('❌ Migration failed:', err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
