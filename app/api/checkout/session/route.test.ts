/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetCartForCheckout, mockCreateGuestCheckoutSession } = vi.hoisted(
  () => ({
    mockGetCartForCheckout: vi.fn(),
    mockCreateGuestCheckoutSession: vi.fn(),
  }),
);

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
  createGuestCheckoutSession: mockCreateGuestCheckoutSession,
}));

import { POST } from './route';

describe('POST /api/checkout/session', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetCartForCheckout.mockReset();
    mockCreateGuestCheckoutSession.mockReset();
  });

  it('returns sessionId on success', async () => {
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-1', country: 'DE' },
    });
    mockCreateGuestCheckoutSession.mockResolvedValue('session-abc');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mockCreateGuestCheckoutSession).toHaveBeenCalledWith('cart-1', 'DE');

    const body = await response.json();
    expect(body.sessionId).toBe('session-abc');
  });

  it('defaults country to DE when cart has no country', async () => {
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-2' },
    });
    mockCreateGuestCheckoutSession.mockResolvedValue('session-def');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mockCreateGuestCheckoutSession).toHaveBeenCalledWith('cart-2', 'DE');
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
    mockCreateGuestCheckoutSession.mockRejectedValue(
      new Error('Checkout session unavailable'),
    );

    const response = await POST();

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Checkout session unavailable');
  });
});
