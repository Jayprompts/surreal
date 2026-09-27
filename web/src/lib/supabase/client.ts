import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '../env';

// Supabase in the browser (sign-in with the emailed code). The session is kept in cookies so the
// website's server can read it too.
export const supabaseBrowser = () => createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseKey);
