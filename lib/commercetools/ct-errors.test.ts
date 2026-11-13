import { describe, expect, it } from 'vitest';

import {
  CtFetchError,
  getCtCorrelationId,
  isCtConcurrentModification,
  isCtNotFound,
  parseCtError,
  toCtFetchError,
} from './ct-errors';

const sdkError = Object.assign(new Error('x'), {
  statusCode: 409,
  code: 'ConcurrentModification',
  headers: { 'x-correlation-id': 'c-1' },
  body: {
    statusCode: 409,
    message: 'Version mismatch',
    errors: [{ code: 'ConcurrentModification', message: 'm' }],
  },
});

describe('ct-errors', () => {
  it('parses SDK errors', () =>
    expect(parseCtError(sdkError)).toEqual({
      statusCode: 409,
      code: 'ConcurrentModification',
      message: 'Version mismatch',
    }));

  it('unwraps the network error shape', () =>
    expect(
      parseCtError({
        body: null,
        error: Object.assign(new Error('net'), {
          statusCode: 0,
          code: 'NetworkError',
        }),
      }).code,
    ).toBe('NetworkError'));

  it('classifies a TooManyRequests error by its status code', () => {
    const tooMany = Object.assign(new Error('Too Many Requests'), {
      name: 'TooManyRequests',
      statusCode: 429,
      body: { statusCode: 429, message: 'slow down', errors: [] },
    });
    expect(parseCtError(tooMany).statusCode).toBe(429);
  });

  it('parses raw fetch errors without keeping raw text in the message', () => {
    const err = toCtFetchError(
      new Response('', { status: 400, headers: { 'x-correlation-id': 'c-2' } }),
      '{"errors":[{"code":"DuplicateField"}],"message":"dup"}',
    );
    expect(parseCtError(err)).toEqual({
      statusCode: 400,
      code: 'DuplicateField',
      message: 'dup',
    });
    expect(err.message).toBe('commercetools request failed (400)');
    expect(getCtCorrelationId(err)).toBe('c-2');
  });

  it('reads the OAuth error field of token endpoint responses', () => {
    const err = toCtFetchError(
      new Response('', { status: 400 }),
      '{"statusCode":400,"message":"m","error":"invalid_scope"}',
    );
    expect(parseCtError(err)).toEqual({
      statusCode: 400,
      code: 'invalid_scope',
      message: 'm',
    });
  });

  it('keeps non-JSON raw bodies out of the error', () =>
    expect(
      toCtFetchError(new Response('', { status: 502 }), '<html>secret</html>').body,
    ).toBeNull());

  it.each([[null], [undefined], ['str'], [new Error('plain')]])(
    'returns nulls for %s',
    (e) =>
      expect(parseCtError(e)).toEqual({
        statusCode: null,
        code: null,
        message: null,
      }),
  );

  it('detects not-found and concurrent modification', () => {
    const notFound = Object.assign(new Error('x'), {
      statusCode: 404,
      body: {
        statusCode: 404,
        message: 'm',
        errors: [{ code: 'ResourceNotFound', message: 'm' }],
      },
    });
    expect(isCtNotFound(notFound)).toBe(true);
    expect(isCtNotFound(new CtFetchError(404, null, null))).toBe(true);
    expect(isCtConcurrentModification(sdkError)).toBe(true);
    expect(isCtNotFound(new Error('plain'))).toBe(false);
    expect(isCtConcurrentModification(new Error('plain'))).toBe(false);
  });
});
