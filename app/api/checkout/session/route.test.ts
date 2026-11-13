/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetCartForCheckout,
  mockCreateCheckoutSession,
  mockGetStorefrontContext,
  mockSetLastOrderSession,
} = vi.hoisted(() => ({
  mockGetCartForCheckout: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
  mockGetStorefrontContext: vi.fn(),
  mockSetLastOrderSession: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  getCartForCheckout: mockGetCartForCheckout,
}));

vi.mock('@/lib/commercetools/checkout-session', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}));

vi.mock('@/lib/commercetools/last-order-session', () => ({
  setLastOrderSession: mockSetLastOrderSession,
}));

vi.mock('@/lib/commercetools/order-number', () => ({
  createOrderNumber: () => 'ZT-20261113-0000ABCD',
}));

vi.mock('@/lib/commercetools/storefront-context', () => ({
  getStorefrontContext: mockGetStorefrontContext,
}));

import {
  CartAccessError,
  CartNotFoundError,
  CheckoutSessionError,
} from '@/lib/commercetools/domain-errors';

import { POST } from './route';

describe('POST /api/checkout/session', () => {
  beforeEach(() => {
    mockGetCartForCheckout.mockReset();
    mockCreateCheckoutSession.mockReset();
    mockGetStorefrontContext.mockReset();
    mockSetLastOrderSession.mockReset();
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
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith('cart-1', 'DE', 'ZT-20261113-0000ABCD');

    const body = await response.json();
    expect(body.sessionId).toBe('session-abc');
  });

  it('creates the Checkout session with a futureOrderNumber and remembers it for the cart', async () => {
    mockGetCartForCheckout.mockResolvedValue({ cart: { id: 'cart-1', country: 'DE' } });
    mockCreateCheckoutSession.mockResolvedValue('session-abc');
    const response = await POST();
    expect(response.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith('cart-1', 'DE', 'ZT-20261113-0000ABCD');
    expect(mockSetLastOrderSession).toHaveBeenCalledWith({
      orderNumber: 'ZT-20261113-0000ABCD',
      cartId: 'cart-1',
    });
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
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith('cart-2', 'GB', 'ZT-20261113-0000ABCD');
  });

  it('returns 403 when cart access is denied', async () => {
    mockGetCartForCheckout.mockRejectedValue(new CartAccessError());

    const response = await POST();

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toMatch(/access denied/i);
  });

  it('returns a generic message when session creation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-1', country: 'DE' },
    });
    mockCreateCheckoutSession.mockRejectedValue(
      new Error(
        'Failed to create checkout session (403): {"message":"insufficient_scope manage_orders"}',
      ),
    );

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Something went wrong. Please try again.');
    expect(body.error).not.toMatch(/insufficient_scope|403/);
  });

  it('maps CheckoutSessionError to 502 with fixed copy', async () => {
    mockGetCartForCheckout.mockResolvedValue({
      cart: { id: 'cart-1', country: 'DE' },
    });
    mockCreateCheckoutSession.mockRejectedValue(new CheckoutSessionError());

    const response = await POST();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Checkout is temporarily unavailable. Please try again.',
      code: 'CheckoutUnavailable',
    });
  });

  it('maps CartNotFoundError to 404', async () => {
    mockGetCartForCheckout.mockRejectedValue(new CartNotFoundError());

    const response = await POST();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'Cart not found',
      code: 'CartNotFound',
    });
  });
});
