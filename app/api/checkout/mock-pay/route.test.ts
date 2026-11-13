/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsEnabled, mockPlace } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockPlace: vi.fn(),
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsEnabled,
  placeMockPayment: mockPlace,
}));

import { MockCheckoutError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

import { POST } from './route';

const ENDPOINT = 'http://localhost/api/checkout/mock-pay';

describe('POST /api/checkout/mock-pay', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockPlace.mockReset();
    mockIsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when mock payments are disabled', async () => {
    mockIsEnabled.mockReturnValue(false);

    const response = await POST(jsonRequest(ENDPOINT, {}));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('Mock payments are disabled');
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it('places the order with the selected shipping method', async () => {
    mockPlace.mockResolvedValue({ orderId: 'order-1' });

    const response = await POST(jsonRequest(ENDPOINT, { shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(200);
    expect(mockPlace).toHaveBeenCalledWith({ shippingMethodId: 'ship-1' });
    await expect(response.json()).resolves.toEqual({ orderId: 'order-1' });
  });

  it('returns 400 when the cart cannot be ordered', async () => {
    mockPlace.mockRejectedValue(new MockCheckoutError('Cart is empty'));

    const response = await POST(jsonRequest(ENDPOINT, {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Cart is empty',
      code: 'MockCheckoutFailed',
    });
  });

  it('returns a generic 500 when order creation fails unexpectedly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPlace.mockRejectedValue(new Error('upstream down'));

    const response = await POST(jsonRequest(ENDPOINT, {}));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(body)).not.toContain('upstream down');
  });

  it('returns 400 for a null body', async () => {
    mockIsEnabled.mockReturnValue(true);

    expect((await POST(jsonRequest(ENDPOINT, null))).status).toBe(400);
  });

  it('returns 415 for text/plain', async () => {
    mockIsEnabled.mockReturnValue(true);

    expect(
      (await POST(jsonRequest(ENDPOINT, {}, { headers: { 'content-type': 'text/plain' } })))
        .status,
    ).toBe(415);
  });
});
