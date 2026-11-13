/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

import { parseLastOrderSession } from './last-order-session';

describe('parseLastOrderSession', () => {
  it('accepts a complete last-order value', () => {
    expect(
      parseLastOrderSession({ orderNumber: 'ZT-20261113-0000ABCD', cartId: 'cart-1' }),
    ).toEqual({ orderNumber: 'ZT-20261113-0000ABCD', cartId: 'cart-1' });
  });

  it.each([undefined, {}, { orderNumber: 'x' }, { orderNumber: 1, cartId: 'c' }])(
    'rejects %o',
    (value) => {
      expect(parseLastOrderSession(value)).toBeNull();
    },
  );
});
