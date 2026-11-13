/** @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { customerSessionCookie, parseCustomerSession } from './customer-session';

const forged = JSON.stringify({
  accessToken: 'x',
  refreshToken: 'x',
  expiresAt: 9_999_999_999_999,
  customerId: 'victim',
});

describe('customer session cookie', () => {
  it('ignores a forged plain-JSON customer cookie', () => {
    expect(customerSessionCookie.readFrom({ get: () => ({ value: forged }) })).toBeNull();
  });

  it('reads back a sealed session', () => {
    const s = { accessToken: 'a', refreshToken: 'r', expiresAt: 1, customerId: 'cust-1' };
    expect(
      customerSessionCookie.readFrom({
        get: () => ({ value: customerSessionCookie.serialize(s) }),
      }),
    ).toEqual(s);
  });

  it('parseCustomerSession rejects wrong field types', () => {
    expect(
      parseCustomerSession({
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: '1',
        customerId: 'c',
      }),
    ).toBeNull();
  });
});
