/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => import('@/test/mocks/commercetools-env'));

import {
  CustomerAuthError,
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

  it('maps invalid_scope to a CustomerAuthError and logs a configuration hint without the password', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(400, { statusCode: 400, error: 'invalid_scope' }),
    );
    const error = await requestCustomerPasswordToken('jane@example.com', 'pw').catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(CustomerAuthError);
    expect(error).toMatchObject({
      code: 'invalid_scope',
      statusCode: 400,
      message: 'Authentication failed',
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('CTP_CUSTOMER_SCOPES'),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('pw');
  });

  it('rejects a password-grant response without refresh_token', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { access_token: 'a', expires_in: 3600 }));
    await expect(
      requestCustomerPasswordToken('jane@example.com', 'pw'),
    ).rejects.toMatchObject({ code: 'TokenError' });
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

  it('throws a rejected-session CustomerAuthError on invalid_grant', async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { error: 'invalid_grant' }));
    const error = await refreshCustomerSession(session).catch((e) => e);
    expect(error).toBeInstanceOf(CustomerAuthError);
    expect(error).toMatchObject({ code: 'RefreshFailed', statusCode: 400 });
    expect(isCustomerSessionRejected(error)).toBe(true);
  });

  it('does not treat a 503 or a network error as a rejected session', () => {
    expect(
      isCustomerSessionRejected(new CustomerAuthError('RefreshFailed', 'Session expired', 503)),
    ).toBe(false);
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

  it('throws when revocation answers 5xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(revokeCustomerAccessToken('a')).rejects.toMatchObject({
      code: 'RevokeFailed',
      statusCode: 503,
    });
  });
});
