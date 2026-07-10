/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({
  commercetoolsEnv: {
    authUrl: 'https://auth.example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  },
}));

import { getClientCredentialsAccessToken, resetAccessTokenCache } from './access-token';

describe('getClientCredentialsAccessToken', () => {
  afterEach(() => {
    resetAccessTokenCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requests and caches client credentials token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ access_token: 'token-abc', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getClientCredentialsAccessToken()).resolves.toBe('token-abc');
    await expect(getClientCredentialsAccessToken()).resolves.toBe('token-abc');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when token endpoint fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid_client',
      }),
    );

    await expect(getClientCredentialsAccessToken()).rejects.toThrow(
      'Failed to obtain access token (401)',
    );
  });
});
