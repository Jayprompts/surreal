import 'server-only';
import { supabaseServer } from './supabase/server';

const API_URL = process.env.API_URL;

export type ApiError = { message: string; code?: string; details?: Record<string, string[]> };
export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiError };

// Calls our API from the website's server with the signed-in person's Supabase token.
// The API verifies the token itself; the browser never talks to the API directly.
export async function api<T>(path: string, init: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {}): Promise<ApiResult<T>> {
  if (!API_URL) throw new Error('Missing API_URL. Copy web/.env.example to web/.env.local and fill it in.');

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, status: 401, error: { message: 'Sign in to continue', code: 'unauthenticated' } };

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 503, error: { message: "We couldn't reach Surreal right now. Try again in a moment.", code: 'api_unreachable' } };
  }

  const json = await res.json().catch(() => null);
  if (res.ok && json?.success) return { ok: true, status: res.status, data: json.data as T };
  return { ok: false, status: res.status, error: json?.error ?? { message: 'Something went wrong. Try again in a moment.' } };
}
