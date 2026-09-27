import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4300),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a Postgres connection string'),
  WEB_URL: z.url(),
  // Supabase project URL. Sign-in tokens are verified against its public keys; the API holds no Supabase secret.
  SUPABASE_URL: z.url(),

  // Licence keys are stored as HMAC-SHA256(key, KEY_HASH_SECRET). Never change it in production:
  // every existing key would stop matching.
  KEY_HASH_SECRET: z.string().min(32, 'KEY_HASH_SECRET must be at least 32 characters'),
  // AES-256-GCM key (32 bytes, base64) that holds a key's full text until its owner reveals it once.
  KEY_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'KEY_ENCRYPTION_KEY must be 32 bytes, base64 (openssl rand -base64 32)'),

  // Outgoing email (key emails, and later transfer/donation emails). Local: Supabase's Mailpit on port 54325.
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.stringbool().default(false), // true for port 465 (TLS from the start)
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(3), // e.g. Surreal <no-reply@example.com>
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
