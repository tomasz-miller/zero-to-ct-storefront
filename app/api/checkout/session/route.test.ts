/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetCartForCheckout,
  mockCreateCheckoutSession,
  mockGetStorefrontContext,
} = vi.hoisted(() => ({
  mockGetCartForCheckout: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
  mockGetStorefrontContext: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  getCartForCheckout: mockGetCartForCheckout,
  CartAccessError: class CartAccessError extends Error {},
  CartNotFoundError: class CartNotFoundError extends Error {
    constructor(message = 'Cart not found') {
      super(message);
      this.name = 'CartNotFoundError';
    }
  },
}));

vi.mock('@/lib/commercetools/checkout-session', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}));

vi.mock('@/lib/commercetools/storefront-context', () => ({
  getStorefrontContext: mockGetStorefrontContext,
}));

import { POST } from './route';

describe('POST /api/checkout/session', () => {
  beforeEach(() => {
    mockGetCartForCheckout.mockReset();
    mockCreateCheckoutSession.mockReset();
    mockGetStorefrontContext.mockReset();
    mockGetStorefrontContext.mockResolvedValue({
      country: 'DE',
      currency: 'EUR',
      locale: 'en-GB',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sessionId on success', async () => {
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-1', country: 'DE' },
    });
    mockCreateCheckoutSession.mockResolvedValue('session-abc');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith('cart-1', 'DE');

    const body = await response.json();
    expect(body.sessionId).toBe('session-abc');
  });

  it('defaults country to the active market when cart has no country', async () => {
    mockGetStorefrontContext.mockResolvedValue({
      country: 'GB',
      currency: 'GBP',
      locale: 'en-GB',
    });
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-2' },
    });
    mockCreateCheckoutSession.mockResolvedValue('session-def');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith('cart-2', 'GB');
  });

  it('returns 403 when cart access is denied', async () => {
    const { CartAccessError } = await import('@/lib/commercetools/cart');
    mockGetCartForCheckout.mockRejectedValue(new CartAccessError());

    const response = await POST();

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toMatch(/access denied/i);
  });

  it('returns 400 when cart is not found', async () => {
    const { CartNotFoundError } = await import('@/lib/commercetools/cart');
    mockGetCartForCheckout.mockRejectedValue(
      new CartNotFoundError('No active cart'),
    );

    const response = await POST();

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('No active cart');
  });

  it('returns 500 when checkout session creation fails', async () => {
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-1', country: 'DE' },
    });
    mockCreateCheckoutSession.mockRejectedValue(
      new Error('Checkout session unavailable'),
    );

    const response = await POST();

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Checkout session unavailable');
  });
});
