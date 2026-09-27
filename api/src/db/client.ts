import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';

// prepare: false keeps us compatible with Supabase's transaction pooler in production.
export const sql = postgres(env.DATABASE_URL, { max: 10, prepare: false, connect_timeout: 10, onnotice: () => {} });
export const db = drizzle(sql); // the schema is passed in here in Part B

export async function connectDB(): Promise<void> {
  await sql`select 1`;
  console.log('✅ Postgres connected');
}

export async function disconnectDB(): Promise<void> {
  await sql.end({ timeout: 5 });
}

// Used by /api/health: true if the database answers within the time limit.
export async function pingDB(timeoutMs = 2000): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB ping timed out')), timeoutMs);
  });
  try {
    await Promise.race([sql`select 1`, timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
