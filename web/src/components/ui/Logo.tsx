import { useId } from 'react';

// The Surreal mark: two overlapping faces (you, and who you become). Placeholder until a real logo exists.
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="16" r="9" fill="none" stroke={`url(#${id})`} strokeWidth="3" />
      <circle cx="20" cy="16" r="9" fill="none" stroke={`url(#${id})`} strokeWidth="3" opacity="0.7" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
      <LogoMark />
      Surreal
    </span>
  );
}
