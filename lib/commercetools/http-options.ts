import 'server-only';

import type { HttpMiddlewareOptions, RetryOptions } from '@commercetools/ts-client';

import { commercetoolsEnv } from './env';

export const CT_HTTP_TIMEOUT_MS = 10_000;
export const CT_AUTH_TIMEOUT_MS = 10_000;

/**
 * ts-client always prepends 429 and 503 to `retryCodes`, so the effective set is
 * 429, 500, 502, 503 and 504. `maxDelay` caps the backoff (a longer `Retry-After`
 * is not retried) and `retryOnAbort: false` keeps a timed-out request from being resent.
 */
export const CT_RETRY_CONFIG: RetryOptions = {
  maxRetries: 3,
  retryDelay: 200,
  backoff: true,
  maxDelay: 2_000,
  retryOnAbort: false,
  retryCodes: [500, 502, 504],
};

export function createHttpMiddlewareOptions(): HttpMiddlewareOptions {
  return {
    host: commercetoolsEnv.apiUrl,
    httpClient: fetch,
    timeout: CT_HTTP_TIMEOUT_MS,
    enableRetry: true,
    retryConfig: CT_RETRY_CONFIG,
    includeRequestInErrorResponse: false,
  };
}
