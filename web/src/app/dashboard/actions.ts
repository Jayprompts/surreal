'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';
import type { KeyView } from '@/lib/types';

export type KeyActionResult = { ok: true; fullKey: string } | { ok: false; message: string };

// "Get free key": the response carries the full key this one time.
export async function getFreeKey(): Promise<KeyActionResult> {
  const r = await api<{ key: KeyView; fullKey: string }>('/keys/free', { method: 'POST' });
  revalidatePath('/dashboard'); // the card under the one-time view is already up to date when it closes
  return r.ok ? { ok: true, fullKey: r.data.fullKey } : { ok: false, message: r.error.message };
}

// "Reveal key" for keys issued while you weren't here (granted, or from a donation). Works once.
export async function revealKey(): Promise<KeyActionResult> {
  const r = await api<{ fullKey: string }>('/keys/current/reveal', { method: 'POST' });
  revalidatePath('/dashboard');
  return r.ok ? { ok: true, fullKey: r.data.fullKey } : { ok: false, message: r.error.message };
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
