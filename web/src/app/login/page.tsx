import type { Metadata } from 'next';
import { safeNext } from '@/lib/format';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Sign in or create an account</h1>
      <p className="mt-2 text-muted">We&apos;ll email you a 6-digit code. No password needed.</p>
      <div className="mt-8">
        <LoginForm next={safeNext(next)} />
      </div>
    </div>
  );
}
