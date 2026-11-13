import 'server-only';

import type { CustomerSession } from './customer-session';
import { commercetoolsEnv } from './env';

export type CustomerTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

export class CustomerAuthError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'CustomerAuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const CUSTOMER_TOKEN_REFRESH_BUFFER_MS = 60_000;

type TokenErrorBody = {
  error?: string;
  errors?: Array<{ code?: string }>;
};

function getBasicAuthHeader(): string {
  return Buffer.from(
    `${commercetoolsEnv.clientId}:${commercetoolsEnv.clientSecret}`,
  ).toString('base64');
}

function parseTokenErrorBody(raw: string): TokenErrorBody {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as TokenErrorBody) : {};
  } catch {
    return {};
  }
}

/**
 * Password-flow token request. The scope list comes from CTP_CUSTOMER_SCOPES (default:
 * manage_my_profile and manage_my_orders); omitting it would grant every scope of the API client.
 * https://docs.commercetools.com/api/authorization.md#password-flow
 */
export async function requestCustomerPasswordToken(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
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
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    const body = parseTokenErrorBody(raw);
    const code = body.errors?.[0]?.code ?? body.error ?? 'TokenError';
    if (code === 'invalid_scope') {
      console.error(
        '[customer-token] invalid_scope: every CTP_CUSTOMER_SCOPES entry must exist on the API client',
      );
    }
    throw new CustomerAuthError(code, 'Authentication failed', response.status);
  }

  let body: CustomerTokenResponse;
  try {
    body = JSON.parse(raw) as CustomerTokenResponse;
  } catch {
    throw new CustomerAuthError('ParseError', 'Failed to parse token response', 500);
  }

  if (!body.access_token || !body.refresh_token) {
    throw new CustomerAuthError('TokenError', 'Customer token response missing tokens', 500);
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}

/**
 * True only when the token endpoint rejected the refresh token (400/401). Network errors and 5xx
 * are transient: callers keep the cookie and retry later.
 */
export function isCustomerSessionRejected(error: unknown): boolean {
  return (
    error instanceof CustomerAuthError &&
    (error.statusCode === 400 || error.statusCode === 401)
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
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new CustomerAuthError('RefreshFailed', 'Session expired', response.status);
  }

  let body: CustomerTokenResponse;
  try {
    body = JSON.parse(raw) as CustomerTokenResponse;
  } catch {
    throw new CustomerAuthError('ParseError', 'Failed to parse token response', 500);
  }

  if (!body.access_token) {
    throw new CustomerAuthError('TokenError', 'Customer token response missing tokens', 500);
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
    customerId: session.customerId,
  };
}
