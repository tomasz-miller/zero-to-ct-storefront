import 'server-only';

import { commercetoolsEnv } from './env';

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;

export async function getClientCredentialsAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(
    `${commercetoolsEnv.clientId}:${commercetoolsEnv.clientSecret}`,
  ).toString('base64');

  const response = await fetch(`${commercetoolsEnv.authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Failed to obtain access token (${response.status}): ${raw || 'empty response'}`,
    );
  }

  let body: { access_token?: string; expires_in?: number };
  try {
    body = JSON.parse(raw) as { access_token?: string; expires_in?: number };
  } catch {
    throw new Error('Failed to parse access token response');
  }

  if (!body.access_token) {
    throw new Error('Access token response missing access_token');
  }

  tokenCache = {
    accessToken: body.access_token,
    expiresAtMs: now + (body.expires_in ?? 3600) * 1000,
  };

  return tokenCache.accessToken;
}

/** @internal test helper */
export function resetAccessTokenCache(): void {
  tokenCache = null;
}
