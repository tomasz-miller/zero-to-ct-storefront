import 'server-only';

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

import { commercetoolsEnv } from '@/lib/commercetools/env';

const PREFIX = 'v1.';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HKDF_INFO = 'zero-to-ct-storefront:sealed-cookie:v1';
const SECRET_ERROR =
  'SESSION_SECRET must be set to base64 of at least 32 random bytes (openssl rand -base64 32)';

let cachedKey: { secret: string; key: Buffer } | undefined;

function getKey(): Buffer {
  const secret = commercetoolsEnv.sessionSecret;
  if (!secret) throw new Error(SECRET_ERROR);
  if (cachedKey?.secret === secret) return cachedKey.key;
  const raw = Buffer.from(secret, 'base64');
  if (raw.length < 32) throw new Error(SECRET_ERROR);
  const key = Buffer.from(hkdfSync('sha256', raw, Buffer.alloc(0), HKDF_INFO, 32));
  cachedKey = { secret, key };
  return key;
}

/** Encrypts and authenticates a JSON value: `v1.` + base64url(iv || tag || ciphertext). */
export function sealJson(value: unknown): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

/** Returns the sealed value, or null when it is absent, malformed, tampered with or sealed under another secret. */
export function unsealJson(sealed: string | undefined): unknown | null {
  if (!sealed) return null;
  const key = getKey();
  if (!sealed.startsWith(PREFIX)) return null;
  const data = Buffer.from(sealed.slice(PREFIX.length), 'base64url');
  if (data.length < IV_LENGTH + TAG_LENGTH + 1) return null;
  try {
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(plain) as unknown;
  } catch {
    return null;
  }
}
