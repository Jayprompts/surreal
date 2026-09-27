import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import { supabaseIssuer, supabaseJwksUrl } from '../config/env.js';
import { AppError } from './AppError.js';

// Supabase's public signing keys, fetched once and cached (re-fetched when a token names an unknown key).
const jwks = createRemoteJWKSet(supabaseJwksUrl, { cacheMaxAge: 10 * 60_000, cooldownDuration: 30_000 });

export type AuthClaims = {
  userId: string;
  email: string | null;
  phone: string | null;
  aal: 'aal1' | 'aal2'; // aal2 = signed in with a second factor (TOTP) in this session
  sessionId: string | null;
};

// Verifies a Supabase access token and returns who it belongs to.
// Only asymmetric algorithms are accepted, so a token signed with a shared secret can never pass.
export async function verifyAccessToken(token: string): Promise<AuthClaims> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: supabaseIssuer,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    }));
  } catch (err) {
    if (err instanceof errors.JWTExpired) throw new AppError(401, 'Your session has expired. Sign in again.', undefined, 'session_expired');
    // Couldn't reach Supabase for its keys: our problem, not the user's.
    if (err instanceof errors.JWKSTimeout || !(err instanceof errors.JOSEError)) {
      console.error('Sign-in keys unavailable:', err);
      throw new AppError(503, 'Sign-in is temporarily unavailable. Try again in a minute.', undefined, 'auth_unavailable');
    }
    throw new AppError(401, 'Sign in to continue', undefined, 'unauthenticated');
  }

  if (payload.role !== 'authenticated' || typeof payload.sub !== 'string') {
    throw new AppError(401, 'Sign in to continue', undefined, 'unauthenticated');
  }

  const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
  return {
    userId: payload.sub,
    email: str(payload.email)?.toLowerCase() ?? null,
    phone: str(payload.phone),
    aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
    sessionId: str(payload.session_id),
  };
}
