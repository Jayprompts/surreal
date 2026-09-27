// Dates are shown in Nigerian time (the beta's audience).
const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Lagos' });

export const formatDate = (iso: string) => day.format(new Date(iso));

export function daysLeft(iso: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const featureNames = (f: { face: boolean; voice: boolean; voiceCloning: boolean }) =>
  [f.face && 'Character look', f.voice && 'Character voice', f.voiceCloning && 'Custom voices'].filter(Boolean) as string[];

// Only same-site paths are allowed as "come back here after sign-in" targets (no open redirects).
export const safeNext = (next: string | undefined | null) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard';
