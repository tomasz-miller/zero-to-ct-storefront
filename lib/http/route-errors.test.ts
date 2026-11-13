import { afterEach, describe, expect, it, vi } from 'vitest';

import { CartNotFoundError } from '@/lib/commercetools/domain-errors';

import { toErrorResponse } from './route-errors';

afterEach(() => vi.restoreAllMocks());

describe('toErrorResponse', () => {
  it('returns status, message and code of a PublicError', async () => {
    const res = toErrorResponse(new CartNotFoundError(), 'api/cart');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'Cart not found',
      code: 'CartNotFound',
    });
  });

  it('never leaks CT message or request body', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ctError = Object.assign(
      new Error('There is already a customer with email a@b.c'),
      {
        statusCode: 400,
        headers: { 'x-correlation-id': 'c-9' },
        body: {
          message: 'There is already a customer with email a@b.c',
          errors: [{ code: 'DuplicateField' }],
        },
        originalRequest: { body: { password: 'hunter22' } },
      },
    );
    const res = toErrorResponse(ctError, 'api/auth/register');
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json).toEqual({
      error: 'Something went wrong. Please try again.',
      errorId: expect.any(String),
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/hunter22|a@b\.c/);
    expect(log).toHaveBeenCalledWith(
      '[api/auth/register]',
      expect.objectContaining({
        statusCode: 400,
        code: 'DuplicateField',
        ctCorrelationId: 'c-9',
        errorId: json.errorId,
      }),
    );
  });
});
