import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4300),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a Postgres connection string'),
  WEB_URL: z.url(),
  // Supabase project URL. Sign-in tokens are verified against its public keys; the API holds no Supabase secret.
  SUPABASE_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

// Supabase Auth issues tokens with this issuer and publishes its signing keys here.
export const supabaseIssuer = `${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
export const supabaseJwksUrl = new URL(`${supabaseIssuer}/.well-known/jwks.json`);
