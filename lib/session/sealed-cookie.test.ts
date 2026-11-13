/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { commercetoolsEnv } from '@/test/mocks/commercetools-env';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { sealJson, unsealJson } from './sealed-cookie';

describe('sealed cookie', () => {
  afterEach(() => {
    commercetoolsEnv.sessionSecret = Buffer.alloc(32, 7).toString('base64');
  });

  it('round-trips JSON values', () => {
    expect(unsealJson(sealJson({ a: 1, b: 'x' }))).toEqual({ a: 1, b: 'x' });
  });
  it('uses a fresh IV per seal', () => {
    expect(sealJson({ a: 1 })).not.toBe(sealJson({ a: 1 }));
  });
  it('starts with the v1 prefix', () => {
    expect(sealJson({})).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });
  it.each([undefined, '', 'garbage', JSON.stringify({ customerId: 'victim' }), 'v2.AAAA', 'v1.AAAA'])(
    'returns null for %s',
    (value) => {
      expect(unsealJson(value)).toBeNull();
    },
  );
  it('returns null when the ciphertext is modified', () => {
    const sealed = sealJson({ customerId: 'cust-1' });
    const last = sealed.at(-1) === 'A' ? 'B' : 'A';
    expect(unsealJson(sealed.slice(0, -1) + last)).toBeNull();
  });
  it('returns null for a value sealed under another secret', () => {
    const sealed = sealJson({ a: 1 });
    commercetoolsEnv.sessionSecret = Buffer.alloc(32, 9).toString('base64');
    expect(unsealJson(sealed)).toBeNull();
  });
  it.each([undefined, Buffer.alloc(16, 1).toString('base64')])(
    'throws a SESSION_SECRET error when the secret is %s',
    (secret) => {
      commercetoolsEnv.sessionSecret = secret;
      expect(() => sealJson({})).toThrow(/SESSION_SECRET/);
      expect(() => unsealJson('v1.AAAA')).toThrow(/SESSION_SECRET/);
    },
  );
  it('returns null for an absent value without needing the secret', () => {
    commercetoolsEnv.sessionSecret = undefined;
    expect(unsealJson(undefined)).toBeNull();
    expect(unsealJson('')).toBeNull();
  });
});
