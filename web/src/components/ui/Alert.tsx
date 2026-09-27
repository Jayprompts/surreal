import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  info: 'border-cyan/40 bg-cyan/5',
  success: 'border-success/40 bg-success/5',
  warning: 'border-warning/40 bg-warning/5',
  danger: 'border-danger/40 bg-danger/5',
};

// role="alert" for problems (read out at once), role="status" for everything else.
export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn('rounded-xl border p-4 text-sm', tones[tone])}>
      {title && <p className="font-semibold text-text">{title}</p>}
      {children && <div className={cn('text-muted', title && 'mt-1')}>{children}</div>}
    </div>
  );
}
