/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { commercetoolsEnv } from '@/test/mocks/commercetools-env';

const { mockCookies, get, set, del } = vi.hoisted(() => {
  const get = vi.fn();
  const set = vi.fn();
  const del = vi.fn();
  return { get, set, del, mockCookies: vi.fn(async () => ({ get, set, delete: del })) };
});
vi.mock('next/headers', () => ({ cookies: mockCookies }));
vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { createCookieSession } from './cookie-session';

const parseId = (v: unknown) =>
  v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string'
    ? { id: (v as { id: string }).id }
    : null;
const session = createCookieSession({ name: 'ct_test', maxAge: 60, parse: parseId });
const store = (value?: string) => ({
  get: (n: string) => (n === 'ct_test' && value ? { value } : undefined),
});
const dynamicUsage = () =>
  Object.assign(new Error('Dynamic server usage: cookies'), { digest: 'DYNAMIC_SERVER_USAGE' });

describe('cookie session', () => {
  afterEach(() => {
    commercetoolsEnv.sessionSecret = Buffer.alloc(32, 7).toString('base64');
    vi.useRealTimers();
  });

  it('reads back a serialized value', () => {
    expect(session.readFrom(store(session.serialize({ id: 'a' })))).toEqual({ id: 'a' });
  });
  it('rejects a sealed value written for another cookie name', () => {
    const other = createCookieSession({ name: 'ct_other', maxAge: 60, parse: parseId });
    expect(session.readFrom(store(other.serialize({ id: 'a' })))).toBeNull();
  });
  it('rejects an envelope past its maxAge', () => {
    vi.useFakeTimers({ now: 0 });
    const sealed = session.serialize({ id: 'a' });
    vi.setSystemTime(61_000);
    expect(session.readFrom(store(sealed))).toBeNull();
  });
  it('rejects a value whose shape parse refuses', () => {
    const loose = createCookieSession({ name: 'ct_test', maxAge: 60, parse: (v) => v });
    expect(session.readFrom(store(loose.serialize({ nope: true })))).toBeNull();
  });
  it('writes with the shared cookie options', async () => {
    await expect(session.write({ id: 'a' })).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith('ct_test', expect.stringMatching(/^v1\./), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60,
    });
  });
  it('returns false instead of throwing when cookies are read-only', async () => {
    set.mockImplementationOnce(() => {
      throw new Error('ReadonlyRequestCookiesError');
    });
    del.mockImplementationOnce(() => {
      throw new Error('ReadonlyRequestCookiesError');
    });
    await expect(session.write({ id: 'a' })).resolves.toBe(false);
    await expect(session.clear()).resolves.toBe(false);
  });
  it('read returns null when cookies() throws outside a request', async () => {
    mockCookies.mockRejectedValueOnce(new Error('outside request scope'));
    await expect(session.read()).resolves.toBeNull();
  });
  it.each(['read', 'clear'] as const)('%s rethrows Next.js dynamic-usage errors', async (method) => {
    const error = dynamicUsage();
    mockCookies.mockRejectedValueOnce(error);
    await expect(session[method]()).rejects.toBe(error);
  });
  it('write rethrows Next.js dynamic-usage errors', async () => {
    const error = dynamicUsage();
    mockCookies.mockRejectedValueOnce(error);
    await expect(session.write({ id: 'a' })).rejects.toBe(error);
  });
  it('read propagates a SESSION_SECRET error when a cookie is present', async () => {
    get.mockReturnValueOnce({ value: session.serialize({ id: 'a' }) });
    commercetoolsEnv.sessionSecret = undefined;
    await expect(session.read()).rejects.toThrow(/SESSION_SECRET/);
  });
  it('read returns null without a cookie even when SESSION_SECRET is missing', async () => {
    commercetoolsEnv.sessionSecret = undefined;
    get.mockReturnValueOnce(undefined);
    await expect(session.read()).resolves.toBeNull();
  });
  it('write propagates a SESSION_SECRET error instead of returning false', async () => {
    commercetoolsEnv.sessionSecret = undefined;
    await expect(session.write({ id: 'a' })).rejects.toThrow(/SESSION_SECRET/);
    expect(set).not.toHaveBeenCalled();
  });
});
