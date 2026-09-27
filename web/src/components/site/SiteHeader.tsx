import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { ButtonLink } from '../ui/Button';
import { Wordmark } from '../ui/Logo';

export async function SiteHeader() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  return (
    <header className="border-b border-border">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Surreal home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/download" className="text-sm text-muted hover:text-text">
            Download
          </Link>
          {signedIn ? (
            <ButtonLink href="/dashboard" variant="secondary">
              Dashboard
            </ButtonLink>
          ) : (
            <ButtonLink href="/login">Sign in</ButtonLink>
          )}
        </div>
      </nav>
    </header>
  );
}
