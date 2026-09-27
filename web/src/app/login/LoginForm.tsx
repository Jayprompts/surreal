'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabaseBrowser } from '@/lib/supabase/client';

const RESEND_SECONDS = 60; // Supabase allows one code per email per minute

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? 'Please wait a minute before asking for another code.' : "We couldn't send a code to that email. Check it and try again.");
      return false;
    }
    setWait(RESEND_SECONDS);
    return true;
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (await sendCode()) setStep('code');
  }

  async function onCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) {
      setBusy(false);
      setError("That code isn't right or has expired. Check the latest email, or ask for a new code.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === 'email') {
    return (
      <form onSubmit={onEmail} className="space-y-5" noValidate>
        <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} error={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
          Email me a code
        </Button>
        <p className="text-xs text-faint">
          By continuing you agree to the{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-text">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/acceptable-use" className="underline underline-offset-2 hover:text-text">
            Acceptable use policy
          </Link>
          .
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onCode} className="space-y-5" noValidate>
      <Alert tone="success">
        We sent a code to <strong className="text-text">{email}</strong>. It expires in 10 minutes.
      </Alert>
      <Input
        label="6-digit code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        required
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        error={error}
        className="font-mono text-lg tracking-[0.4em]"
      />
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
        Sign in
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" className="text-muted hover:text-text" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
          Use a different email
        </button>
        <button type="button" className="text-muted hover:text-text disabled:opacity-50" disabled={wait > 0 || busy} onClick={sendCode}>
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </button>
      </div>
    </form>
  );
}
