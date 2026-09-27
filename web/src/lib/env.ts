// Public settings (inlined into the browser bundle at build time, so each must be read by its full name).
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}. Copy web/.env.example to web/.env.local and fill it in.`);
  return value;
}

export const publicEnv = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  downloadUrl: process.env.NEXT_PUBLIC_DOWNLOAD_URL || null,
};
