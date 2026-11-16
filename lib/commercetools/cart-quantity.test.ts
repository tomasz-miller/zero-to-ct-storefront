/**
 * @vitest-environment node
 */
import type { Cart } from '@commercetools/platform-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCartPost, mockExecute } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return {
    mockExecute,
    mockCartPost: vi.fn(() => ({ execute: mockExecute })),
  };
});

vi.mock('./storefront-context', () => ({
  getStorefrontContext: async () => ({ currency: 'EUR', country: 'DE', locale: 'de-DE' }),
  getCatalogContext: async () => ({ currency: 'EUR', country: 'DE', locale: 'en-GB' }),
}));

vi.mock('./products', () => ({
  getProductAvailabilityBySku: vi.fn(async () => ({ isOnStock: true, status: 'in_stock' })),
}));

vi.mock('./cart-session', () => ({
  getCartSession: vi.fn(),
  setCartSession: vi.fn(),
  clearCartSession: vi.fn(),
  createAnonymousId: vi.fn(() => 'anon-new'),
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: vi.fn(),
}));

vi.mock('./market-cart-session', () => ({
  getCartIdForCountry: vi.fn(),
  rememberCartForCountry: vi.fn(),
  forgetCartForCountry: vi.fn(),
}));

vi.mock('./api-root', () => ({
  apiRoot: {
    carts: vi.fn(() => ({
      get: vi.fn(() => ({ execute: mockExecute })),
      post: mockCartPost,
      withId: vi.fn(() => ({ get: vi.fn(() => ({ execute: mockExecute })), post: mockCartPost })),
    })),
  },
}));

import { addLineItem, addLineItems, updateLineItemQuantity } from './cart';
import { getCartSession } from './cart-session';
import { InvalidQuantityError } from './domain-errors';

function cartWithLines(lines: Array<{ id: string; sku: string; quantity: number }>): Cart {
  return {
    id: 'cart-1',
    version: 3,
    anonymousId: 'anon-1',
    country: 'DE',
    cartState: 'Active',
    totalPrice: { currencyCode: 'EUR', centAmount: 0 },
    lineItems: lines.map((line) => ({
      id: line.id,
      productId: `product-${line.sku}`,
      name: { en: line.sku },
      variant: { sku: line.sku, images: [] },
      quantity: line.quantity,
      price: { value: { currencyCode: 'EUR', centAmount: 100 } },
      totalPrice: { currencyCode: 'EUR', centAmount: 100 * line.quantity },
    })),
  } as unknown as Cart;
}

function givenCart(cart: Cart) {
  vi.mocked(getCartSession).mockResolvedValue({ anonymousId: 'anon-1', cartId: cart.id });
  mockExecute.mockResolvedValue({ body: cart });
}

describe('line item quantity validation', () => {
  it('rejects a fractional quantity before any commercetools call', async () => {
    await expect(addLineItems([{ sku: 'A', quantity: 1.5 }])).rejects.toBeInstanceOf(
      InvalidQuantityError,
    );
    expect(mockCartPost).not.toHaveBeenCalled();
  });

  describe('resulting line quantity cap', () => {
    beforeEach(() => {
      mockExecute.mockReset();
      mockCartPost.mockClear();
    });

    it('rejects addLineItem when it would push an existing line past 99', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 95 }]));

      await expect(addLineItem('A', 5)).rejects.toBeInstanceOf(InvalidQuantityError);
      expect(mockCartPost).not.toHaveBeenCalled();
    });

    it('allows addLineItem up to exactly 99 on the resulting line', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 90 }]));

      await addLineItem('A', 9);

      expect(mockCartPost).toHaveBeenCalledTimes(1);
    });

    it('does not count other skus against the cap', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 99 }]));

      await addLineItem('B', 99);

      expect(mockCartPost).toHaveBeenCalledTimes(1);
    });

    it('rejects addLineItems when existing plus requested exceeds 99 for a sku', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 98 }]));

      await expect(
        addLineItems([
          { sku: 'B', quantity: 1 },
          { sku: 'A', quantity: 2 },
        ]),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
      expect(mockCartPost).not.toHaveBeenCalled();
    });

    it('sums repeated skus inside one addLineItems request', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 50 }]));

      await expect(
        addLineItems([
          { sku: 'A', quantity: 30 },
          { sku: 'A', quantity: 30 },
        ]),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
      expect(mockCartPost).not.toHaveBeenCalled();
    });

    it('accepts addLineItems that stays within 99 per sku', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 50 }]));

      await addLineItems([
        { sku: 'A', quantity: 25 },
        { sku: 'A', quantity: 24 },
      ]);

      expect(mockCartPost).toHaveBeenCalledTimes(1);
    });

    it('lets updateLineItemQuantity bring an over-cap line back to 1..99', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 120 }]));

      await updateLineItemQuantity('li-1', 99);

      expect(mockCartPost).toHaveBeenCalledTimes(1);
    });

    it('still rejects updateLineItemQuantity above 99', async () => {
      givenCart(cartWithLines([{ id: 'li-1', sku: 'A', quantity: 120 }]));

      await expect(updateLineItemQuantity('li-1', 100)).rejects.toBeInstanceOf(
        InvalidQuantityError,
      );
      expect(mockCartPost).not.toHaveBeenCalled();
    });
  });
});
