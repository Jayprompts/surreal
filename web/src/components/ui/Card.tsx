import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: ComponentProps<'section'>) {
  return <section className={cn('rounded-2xl border border-border bg-surface p-6', className)} {...rest} />;
}
