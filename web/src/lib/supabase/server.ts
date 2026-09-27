import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '../env';

// Supabase on the website's server, reading the session from this request's cookies.
// Create one per request (never share it between requests).
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called while rendering a page, where cookies are read-only: the proxy refreshes the session instead.
        }
      },
    },
  });
}
