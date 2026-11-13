/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

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

import { addLineItems } from './cart';
import { InvalidQuantityError } from './domain-errors';

describe('line item quantity validation', () => {
  it('rejects a fractional quantity before any commercetools call', async () => {
    await expect(addLineItems([{ sku: 'A', quantity: 1.5 }])).rejects.toBeInstanceOf(
      InvalidQuantityError,
    );
    expect(mockCartPost).not.toHaveBeenCalled();
  });
});
