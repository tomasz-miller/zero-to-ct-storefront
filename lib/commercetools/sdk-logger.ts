import 'server-only';

import type { MiddlewareResponse } from '@commercetools/ts-client';

/**
 * The SDK logger is development-only. The default `console.log` logger prints the whole
 * response (password-reset tokens, customer PII), so this one reads only the request line,
 * status and correlation id, and never touches `body`.
 */
export function shouldEnableSdkLogger(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'development';
}

export function ctSdkLoggerFn(response: MiddlewareResponse): void {
  const correlationId: string | null =
    response.headers?.['x-correlation-id'] ?? response.error?.headers?.['x-correlation-id'] ?? null;
  const method: string | null = response.error?.method ?? response.originalRequest?.method ?? null;
  const uri: string | null = response.error?.uri ?? response.originalRequest?.uri ?? null;

  console.log('[ct-sdk]', { method, uri, statusCode: response.statusCode, correlationId });
}
