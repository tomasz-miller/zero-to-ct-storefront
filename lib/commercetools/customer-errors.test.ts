import { describe, expect, it } from 'vitest';

import { ctErr } from '@/test/helpers/ct-error';

import { toCtFetchError } from './ct-errors';
import { mapCustomerCtError } from './customer-errors';
import { CustomerError } from './domain-errors';

describe('mapCustomerCtError', () => {
  it.each([
    ['InvalidCredentials', undefined, 401, 'Invalid email or password'],
    ['DuplicateField', undefined, 409, 'An account with this email already exists'],
    [
      'ExpiredCustomerPasswordToken',
      undefined,
      400,
      'Password reset link is invalid or expired',
    ],
    [
      'ResourceNotFound',
      'password-reset',
      400,
      'Password reset link is invalid or expired',
    ],
    [
      'ConcurrentModification',
      undefined,
      409,
      'Your profile was updated elsewhere. Refresh the page and try again.',
    ],
    ['InvalidCurrentPassword', undefined, 400, 'Current password is incorrect'],
  ] as const)('maps %s', (code, context, status, message) => {
    const mapped = mapCustomerCtError(ctErr(code), context);
    expect(mapped).toBeInstanceOf(CustomerError);
    expect(mapped).toMatchObject({ status, code, message });
    expect(mapped?.message).not.toContain('internal detail');
  });

  it('returns null for ResourceNotFound outside password reset', () =>
    expect(mapCustomerCtError(ctErr('ResourceNotFound'))).toBeNull());

  it('returns null for codes outside the whitelist', () =>
    expect(mapCustomerCtError(ctErr('InsufficientScope', 'scope', 403))).toBeNull());

  it('maps raw fetch errors too', () =>
    expect(
      mapCustomerCtError(
        toCtFetchError(
          new Response('', { status: 400 }),
          '{"errors":[{"code":"DuplicateField"}]}',
        ),
      )?.status,
    ).toBe(409));
});
