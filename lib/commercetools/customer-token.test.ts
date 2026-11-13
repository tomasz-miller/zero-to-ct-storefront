/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => import('@/test/mocks/commercetools-env'));

import { CtFetchError, parseCtError } from './ct-errors';
import {
  isCustomerSessionRejected,
  refreshCustomerSession,
  requestCustomerPasswordToken,
  revokeCustomerAccessToken,
  revokeCustomerRefreshToken,
} from './customer-token';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe('requestCustomerPasswordToken', () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it('requests a password token with the configured customer scopes', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(200, { access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    );
    await expect(
      requestCustomerPasswordToken('jane@example.com', 'pw'),
    ).resolves.toMatchObject({ accessToken: 'a', refreshToken: 'r' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://auth.example.com/oauth/demo-project/customers/token');
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
    const body = new URLSearchParams(init.body);
    expect(body.get('grant_type')).toBe('password');
    expect(body.get('scope')).toBe(
      'manage_my_profile:demo-project manage_my_orders:demo-project',
    );
  });

  it('throws a CtFetchError carrying invalid_scope and logs the configuration hint without the password', async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { statusCode: 400, error: 'invalid_scope' }));
    const err = await requestCustomerPasswordToken('jane@example.com', 'pw').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CtFetchError);
    expect(parseCtError(err)).toMatchObject({ statusCode: 400, code: 'invalid_scope' });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('CTP_CUSTOMER_SCOPES'));
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('pw');
  });

  it('rejects a password-grant response without refresh_token as TokenError 500', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { access_token: 'a', expires_in: 3600 }));
    await expect(requestCustomerPasswordToken('jane@example.com', 'pw')).rejects.toMatchObject({
      status: 500,
      code: 'TokenError',
      message: 'Sign-in failed',
    });
  });
});

describe('refreshCustomerSession', () => {
  const session = {
    accessToken: 'a-old',
    refreshToken: 'r-old',
    expiresAt: 0,
    customerId: 'cust-1',
  };

  afterEach(() => {
    fetchMock.mockReset();
    vi.useRealTimers();
  });

  it('refreshes at {authUrl}/oauth/token with grant_type=refresh_token and no scope', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { access_token: 'a-new', expires_in: 172800 }));
    await refreshCustomerSession(session);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://auth.example.com/oauth/token');
    const body = new URLSearchParams(init.body);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('r-old');
    expect(body.get('scope')).toBeNull();
  });

  it('keeps the previous refresh token when the response has none', async () => {
    vi.useFakeTimers({ now: 1_000 });
    fetchMock.mockResolvedValueOnce(reply(200, { access_token: 'a-new', expires_in: 172800 }));
    await expect(refreshCustomerSession(session)).resolves.toEqual({
      accessToken: 'a-new',
      refreshToken: 'r-old',
      expiresAt: 1_000 + 172_800_000,
      customerId: 'cust-1',
    });
  });

  it('throws a rejected-session CtFetchError on invalid_grant', async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { error: 'invalid_grant' }));
    const error = await refreshCustomerSession(session).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CtFetchError);
    expect(parseCtError(error)).toMatchObject({ statusCode: 400, code: 'invalid_grant' });
    expect(isCustomerSessionRejected(error)).toBe(true);
  });

  it('isCustomerSessionRejected accepts only 400/401 token-endpoint failures', () => {
    expect(isCustomerSessionRejected(new CtFetchError(401, null, null))).toBe(true);
    expect(isCustomerSessionRejected(new CtFetchError(503, null, null))).toBe(false);
    expect(isCustomerSessionRejected(new TypeError('fetch failed'))).toBe(false);
  });
});

describe('token revocation', () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it('revokes a refresh token at {authUrl}/oauth/token/revoke with the type hint', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await revokeCustomerRefreshToken('r');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://auth.example.com/oauth/token/revoke');
    expect(init.headers.Authorization).toMatch(/^Basic /);
    const body = new URLSearchParams(init.body);
    expect(body.get('token')).toBe('r');
    expect(body.get('token_type_hint')).toBe('refresh_token');
  });

  it('throws a CtFetchError when revocation answers 5xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const error = await revokeCustomerAccessToken('a').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CtFetchError);
    expect(error).toMatchObject({ statusCode: 503 });
  });
});
