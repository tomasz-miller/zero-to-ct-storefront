/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ctSdkLoggerFn, shouldEnableSdkLogger } from './sdk-logger';

describe('sdk-logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs only method, uri, status and correlation id', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    ctSdkLoggerFn({
      statusCode: 400,
      body: { value: 'reset-token-secret', email: 'a@b.c' },
      resolve: vi.fn(),
      reject: vi.fn(),
      headers: { 'x-correlation-id': 'corr-1' },
      error: {
        method: 'POST',
        statusCode: 400,
        uri: '/demo/login',
        body: { message: 'secret-detail' },
        originalRequest: {
          method: 'POST',
          uri: '/demo/login',
          body: { email: 'a@b.c', password: 'hunter22' },
        },
      },
    } as never);
    expect(log).toHaveBeenCalledWith('[ct-sdk]', {
      method: 'POST',
      uri: '/demo/login',
      statusCode: 400,
      correlationId: 'corr-1',
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /hunter22|secret-detail|a@b\.c|reset-token-secret/,
    );
  });

  it('enables the logger only in development', () => {
    expect(shouldEnableSdkLogger({ NODE_ENV: 'development' } as never)).toBe(true);
    expect(shouldEnableSdkLogger({ NODE_ENV: 'production' } as never)).toBe(false);
    expect(shouldEnableSdkLogger({ NODE_ENV: 'test' } as never)).toBe(false);
  });
});
