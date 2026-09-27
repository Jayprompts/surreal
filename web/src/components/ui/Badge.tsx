import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'border-border text-muted',
  success: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  danger: 'border-danger/40 text-danger',
  accent: 'border-violet/50 text-violet-ink',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}
