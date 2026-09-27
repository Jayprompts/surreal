import { expireOverdueKeys } from '../services/keys.js';

const EVERY_MS = 10 * 60_000;

// Marks keys past their expiry date as expired, every 10 minutes (and once at start-up).
// Accounts are also checked on the spot whenever their keys matter, so this only keeps lists tidy.
export function startKeyExpiry(): () => void {
  const run = async () => {
    try {
      const n = await expireOverdueKeys();
      if (n) console.log(`⏱️  ${n} key${n === 1 ? '' : 's'} expired`);
    } catch (err) {
      console.error('❌ Key expiry sweep failed:', err);
    }
  };
  void run();
  const timer = setInterval(run, EVERY_MS);
  timer.unref();
  return () => clearInterval(timer);
}
