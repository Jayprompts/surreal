// Surreal licence keys: LV-XXXX-XXXX-XXXX.
// 11 random characters + 1 check character, from a 32-character alphabet with no look-alikes
// (no 0/O, no 1/I), so a mistyped key is caught before any server call.

export const KEY_PREFIX = 'LV';
export const KEY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 characters: 5 random bits each
const N = KEY_ALPHABET.length;
const BODY_LENGTH = 11;

const valueOf = (ch: string) => KEY_ALPHABET.indexOf(ch);

// Luhn mod 32: catches every single mistyped character and most swapped neighbours.
function luhnSum(chars: string, startFactor: 1 | 2): number {
  let factor = startFactor;
  let sum = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    let addend = factor * valueOf(chars[i]!);
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / N) + (addend % N);
    sum += addend;
  }
  return sum;
}

export function checkCharacter(body: string): string {
  return KEY_ALPHABET[(N - (luhnSum(body, 2) % N)) % N]!;
}

const format = (chars: string) => `${KEY_PREFIX}-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;

// A new random key. `randomBytes` comes from the caller (node:crypto, or crypto.getRandomValues in a browser),
// so this file stays free of platform APIs. 256 is a multiple of 32, so `byte % 32` is unbiased.
export function generateKey(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(BODY_LENGTH);
  let body = '';
  for (let i = 0; i < BODY_LENGTH; i++) body += KEY_ALPHABET[bytes[i]! % N];
  return format(body + checkCharacter(body));
}

export type KeyCheck = { ok: true; key: string } | { ok: false; reason: 'format' | 'checksum' };

// Accepts what people type (lowercase, spaces, missing dashes) and returns the canonical key,
// or why it can't be right: "format" (wrong shape or characters) or "checksum" (probably a typo).
export function parseKey(input: string): KeyCheck {
  const compact = input.toUpperCase().replace(/[\s-]/g, '');
  if (!compact.startsWith(KEY_PREFIX)) return { ok: false, reason: 'format' };
  const chars = compact.slice(KEY_PREFIX.length);
  if (chars.length !== BODY_LENGTH + 1 || [...chars].some((c) => valueOf(c) < 0)) return { ok: false, reason: 'format' };
  if (luhnSum(chars, 1) % N !== 0) return { ok: false, reason: 'checksum' };
  return { ok: true, key: format(chars) };
}

// What the dashboard shows after the one-time reveal: LV-••••-••••-7KQ9
export const maskKey = (last4: string) => `${KEY_PREFIX}-••••-••••-${last4}`;
