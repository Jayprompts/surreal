// Drizzle wraps database errors (DrizzleQueryError) and keeps the Postgres one in `cause`.
// Returns the Postgres error code (e.g. 23505 unique violation) and constraint name, if there is one.
export function pgError(err: unknown): { code: string; constraint?: string } | null {
  let e: unknown = err;
  for (let depth = 0; depth < 3 && typeof e === 'object' && e !== null; depth++) {
    const x = e as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (typeof x.code === 'string' && /^[0-9A-Z]{5}$/.test(x.code)) {
      return { code: x.code, constraint: typeof x.constraint_name === 'string' ? x.constraint_name : undefined };
    }
    e = x.cause;
  }
  return null;
}
