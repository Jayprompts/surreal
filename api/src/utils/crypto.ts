import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const encryptionKey = Buffer.from(env.KEY_ENCRYPTION_KEY, 'base64');

// Licence keys are stored only as this keyed hash. Without KEY_HASH_SECRET, a copy of the database
// can't be used to guess keys offline.
export const hashKey = (canonicalKey: string) => createHmac('sha256', env.KEY_HASH_SECRET).update(canonicalKey).digest('hex');

// AES-256-GCM, stored as "v1.<iv>.<tag>.<ciphertext>" (base64). Used to hold a key's full text until its
// owner reveals it once; the stored copy is deleted at that moment.
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptSecret(box: string): string {
  const [version, iv, tag, ciphertext] = box.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Unknown secret format');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
