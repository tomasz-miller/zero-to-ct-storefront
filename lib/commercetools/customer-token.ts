import 'server-only';

import { parseCtError, toCtFetchError } from './ct-errors';
import type { CustomerSession } from './customer-session';
import { parseCustomerIdFromScope } from './customer-token-scope';
import { CustomerError } from './domain-errors';
import { commercetoolsEnv } from './env';
import { CT_AUTH_TIMEOUT_MS } from './http-options';

export type CustomerTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

export const CUSTOMER_TOKEN_REFRESH_BUFFER_MS = 60_000;

function getBasicAuthHeader(): string {
  return Buffer.from(
    `${commercetoolsEnv.clientId}:${commercetoolsEnv.clientSecret}`,
  ).toString('base64');
}

function tokenError(): CustomerError {
  return new CustomerError('TokenError', 'Sign-in failed', 500);
}

/** `expires_in` must be a positive finite number; anything else would turn expiresAt into NaN. */
function expiresAtFrom(expiresIn: unknown): number {
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw tokenError();
  }
  return Date.now() + expiresIn * 1000;
}

/**
 * Password-flow token request. The scope list comes from CTP_CUSTOMER_SCOPES (default:
 * manage_my_profile and manage_my_orders); omitting it would grant every scope of the API client.
 * https://docs.commercetools.com/api/authorization.md#password-flow
 */
export async function requestCustomerPasswordToken(
  email: string,
  password: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string | undefined;
}> {
  const response = await fetch(
    `${commercetoolsEnv.authUrl}/oauth/${commercetoolsEnv.projectKey}/customers/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: email,
        password,
        scope: commercetoolsEnv.customerScopes,
      }),
      signal: AbortSignal.timeout(CT_AUTH_TIMEOUT_MS),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    const error = toCtFetchError(response, raw);
    if (parseCtError(error).code === 'invalid_scope') {
      console.error(
        '[customer-token] invalid_scope: every CTP_CUSTOMER_SCOPES entry must exist on the API client',
      );
    }
    throw error;
  }

  let body: CustomerTokenResponse;
  try {
    body = JSON.parse(raw) as CustomerTokenResponse;
  } catch {
    throw tokenError();
  }

  if (!body.access_token || !body.refresh_token) {
    throw tokenError();
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: expiresAtFrom(body.expires_in),
    scope: body.scope,
  };
}

/**
 * True when the token endpoint rejected the refresh token (400/401) or the refresh named another
 * customer (RefreshFailed). Network errors and 5xx are transient: callers keep the cookie and
 * retry later.
 */
export function isCustomerSessionRejected(error: unknown): boolean {
  const { statusCode } = parseCtError(error);
  return (
    statusCode === 400 ||
    statusCode === 401 ||
    (error instanceof CustomerError && error.code === 'RefreshFailed')
  );
}

/**
 * Refresh-token flow: no scope is sent, the new access token keeps the scope of the original
 * grant. The refresh token is not rotated, so concurrent refreshes are safe.
 * https://docs.commercetools.com/api/authorization.md#refresh-token-flow
 */
export async function refreshCustomerSession(
  session: CustomerSession,
): Promise<CustomerSession> {
  const response = await fetch(`${commercetoolsEnv.authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicAuthHeader()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
    signal: AbortSignal.timeout(CT_AUTH_TIMEOUT_MS),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw toCtFetchError(response, raw);
  }

  let body: CustomerTokenResponse;
  try {
    body = JSON.parse(raw) as CustomerTokenResponse;
  } catch {
    throw tokenError();
  }

  if (!body.access_token) {
    throw tokenError();
  }

  const expiresAt = expiresAtFrom(body.expires_in);

  // The refresh keeps the original grant, so a scope naming another customer means the session
  // no longer belongs to this shopper: sign them out through isCustomerSessionRejected.
  const scopedCustomerId = parseCustomerIdFromScope(body.scope);
  if (scopedCustomerId && scopedCustomerId !== session.customerId) {
    throw new CustomerError('RefreshFailed', 'Session expired', 401);
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? session.refreshToken,
    expiresAt,
    customerId: session.customerId,
  };
}

/**
 * Revokes a token at the Authorization Server. The endpoint answers 200 for unknown or already
 * revoked tokens too; a 5xx means the token may still be valid.
 * https://docs.commercetools.com/api/authorization.md#revoke-tokens
 */
async function revokeCustomerToken(
  token: string,
  tokenTypeHint: 'refresh_token' | 'access_token',
): Promise<void> {
  const response = await fetch(`${commercetoolsEnv.authUrl}/oauth/token/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicAuthHeader()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token, token_type_hint: tokenTypeHint }),
    signal: AbortSignal.timeout(CT_AUTH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw toCtFetchError(response, await response.text());
  }
}

export function revokeCustomerRefreshToken(refreshToken: string): Promise<void> {
  return revokeCustomerToken(refreshToken, 'refresh_token');
}

export function revokeCustomerAccessToken(accessToken: string): Promise<void> {
  return revokeCustomerToken(accessToken, 'access_token');
}
