/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsEnabled, mockPlace, mockFailure } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockPlace: vi.fn(),
  mockFailure: vi.fn(),
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsEnabled,
  placeMockPayment: mockPlace,
  mockCheckoutFailure: mockFailure,
}));

import { POST } from './route';

function post(body: unknown) {
  return new Request('http://localhost/api/checkout/mock-pay', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/checkout/mock-pay', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockPlace.mockReset();
    mockFailure.mockReset();
    mockIsEnabled.mockReturnValue(true);
  });

  it('returns 404 when mock payments are disabled', async () => {
    mockIsEnabled.mockReturnValue(false);

    const response = await POST(post({}));

    expect(response.status).toBe(404);
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it('places the order with the selected shipping method', async () => {
    mockPlace.mockResolvedValue({ orderId: 'order-1' });

    const response = await POST(post({ shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(200);
    expect(mockPlace).toHaveBeenCalledWith({ shippingMethodId: 'ship-1' });
    await expect(response.json()).resolves.toEqual({ orderId: 'order-1' });
  });

  it('returns 400 when the cart cannot be ordered', async () => {
    mockPlace.mockRejectedValue(new Error('Cart is empty'));
    mockFailure.mockReturnValue({ status: 400, error: 'Cart is empty' });

    const response = await POST(post({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Cart is empty' });
  });

  it('returns 500 when order creation fails unexpectedly', async () => {
    mockPlace.mockRejectedValue(new Error('upstream down'));
    mockFailure.mockReturnValue(null);

    const response = await POST(post({}));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to place order',
    });
  });
});
