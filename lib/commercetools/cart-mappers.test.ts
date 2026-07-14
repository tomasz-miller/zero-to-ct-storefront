import { describe, expect, it } from 'vitest';

import { mapCart } from './cart-mappers';
import { createCartFixture } from '@/test/fixtures/cart';

describe('mapCart', () => {
  it('maps discount codes and savings from cart totals', () => {
    const cart = createCartFixture();
    const mapped = mapCart(cart, 'en-GB');

    expect(mapped.discountCodes).toEqual([
      {
        id: 'dc-1',
        code: 'BOGO',
        name: 'Buy one get one',
        state: 'MatchesCart',
      },
    ]);
    expect(mapped.subtotal).toEqual({
      centAmount: 99800,
      currencyCode: 'EUR',
    });
    expect(mapped.total).toEqual({
      centAmount: 6799,
      currencyCode: 'EUR',
    });
    expect(mapped.savings).toEqual({
      centAmount: 93001,
      currencyCode: 'EUR',
    });
  });

  it('maps discounted unit prices on line items', () => {
    const cart = createCartFixture({
      lineItems: [
        {
          ...createCartFixture().lineItems[0],
          discountedPricePerQuantity: [
            {
              quantity: 2,
              discountedPrice: {
                value: {
                  type: 'centPrecision',
                  currencyCode: 'EUR',
                  centAmount: 42415,
                  fractionDigits: 2,
                },
                includedDiscounts: [],
              },
            },
          ],
          totalPrice: {
            type: 'centPrecision',
            currencyCode: 'EUR',
            centAmount: 84830,
            fractionDigits: 2,
          },
        },
      ],
      totalPrice: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 84830,
        fractionDigits: 2,
      },
      discountCodes: [],
    });

    const mapped = mapCart(cart, 'en-GB');
    expect(mapped.lineItems[0]?.unitPrice).toEqual({
      centAmount: 42415,
      currencyCode: 'EUR',
    });
    expect(mapped.lineItems[0]?.originalUnitPrice).toEqual({
      centAmount: 49900,
      currencyCode: 'EUR',
    });
  });
});
