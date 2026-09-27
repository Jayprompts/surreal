import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Only used by `db:generate` and `db:studio`. Migrations are applied by src/scripts/migrate.ts.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['surreal'],
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
