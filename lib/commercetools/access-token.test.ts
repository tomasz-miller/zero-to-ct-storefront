/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({
  commercetoolsEnv: {
    authUrl: 'https://auth.example.com',
    projectKey: 'demo-project',
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

  it('requests client credentials limited to manage_sessions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ access_token: 'token-abc', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getClientCredentialsAccessToken();

    expect(new URLSearchParams(fetchMock.mock.calls[0][1].body).get('scope')).toBe(
      'manage_sessions:demo-project',
    );
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

  it('throws a status-only error when the token request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response('{"error":"invalid_client","message":"secret detail"}', {
            status: 401,
          }),
        ),
    );

    const err = await getClientCredentialsAccessToken().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Failed to obtain access token (401)');
    expect((err as Error).message).not.toContain('secret detail');
  });
});
