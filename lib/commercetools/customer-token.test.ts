/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => import('@/test/mocks/commercetools-env'));

import { CustomerAuthError, requestCustomerPasswordToken } from './customer-token';

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
