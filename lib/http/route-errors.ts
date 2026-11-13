import 'server-only';

import { NextResponse } from 'next/server';

import { getCtCorrelationId, parseCtError } from '@/lib/commercetools/ct-errors';

import { PublicError } from './public-error';

/**
 * Maps any thrown value to the BFF error response. Only a `PublicError` message
 * reaches the shopper. Everything else becomes a generic 500 with an `errorId`
 * that is also logged, so support can find the log line. The raw error is never
 * logged: commercetools errors carry the original request (passwords, emails).
 */
export function toErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof PublicError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  const errorId = crypto.randomUUID();
  const parsed = parseCtError(error);
  const summary =
    parsed.statusCode !== null
      ? {
          statusCode: parsed.statusCode,
          code: parsed.code,
          ctCorrelationId: getCtCorrelationId(error),
        }
      : error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { name: typeof error };
  console.error(`[${context}]`, { errorId, ...summary });

  return NextResponse.json(
    { error: 'Something went wrong. Please try again.', errorId },
    { status: 500 },
  );
}
