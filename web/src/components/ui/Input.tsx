import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type Props = ComponentProps<'input'> & { label: string; hint?: string; error?: string | null };

// A labelled input; the hint and error are tied to it for screen readers.
export function Input({ label, hint, error, id, className, ...rest }: Props) {
  const inputId = id ?? rest.name;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full rounded-lg border bg-surface-2 px-3 text-text placeholder:text-faint',
          error ? 'border-danger' : 'border-border focus:border-violet',
          className,
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
