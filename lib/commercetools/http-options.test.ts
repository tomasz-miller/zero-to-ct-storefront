/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { createHttpMiddlewareOptions } from './http-options';

describe('createHttpMiddlewareOptions', () => {
  it('enables retries with backoff, a 2 s delay cap, no abort retry and a 10 s timeout', () => {
    expect(createHttpMiddlewareOptions()).toEqual({
      host: 'https://api.example.com',
      httpClient: fetch,
      timeout: 10_000,
      enableRetry: true,
      includeRequestInErrorResponse: false,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 200,
        backoff: true,
        maxDelay: 2_000,
        retryOnAbort: false,
        retryCodes: [500, 502, 504],
      },
    });
  });
});
