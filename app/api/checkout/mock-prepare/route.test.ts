/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsEnabled, mockPrepare, mockFailure } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockPrepare: vi.fn(),
  mockFailure: vi.fn(),
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsEnabled,
  prepareMockCheckout: mockPrepare,
  mockCheckoutFailure: mockFailure,
}));

import { POST } from './route';

const address = {
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  streetName: 'Demo Street',
  postalCode: '10115',
  city: 'Berlin',
};

function post(body: unknown) {
  return new Request('http://localhost/api/checkout/mock-prepare', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/checkout/mock-prepare', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockPrepare.mockReset();
    mockFailure.mockReset();
    mockIsEnabled.mockReturnValue(true);
  });

  it('returns 404 when mock payments are disabled', async () => {
    mockIsEnabled.mockReturnValue(false);

    const response = await POST(post(address));

    expect(response.status).toBe(404);
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns matching shipping methods', async () => {
    mockPrepare.mockResolvedValue({
      shippingMethods: [
        {
          id: 'ship-1',
          name: 'Standard delivery',
          price: { centAmount: 490, currencyCode: 'EUR' },
        },
      ],
    });

    const response = await POST(post(address));

    expect(response.status).toBe(200);
    expect(mockPrepare).toHaveBeenCalledWith(address);
    await expect(response.json()).resolves.toEqual({
      shippingMethods: [
        {
          id: 'ship-1',
          name: 'Standard delivery',
          price: { centAmount: 490, currencyCode: 'EUR' },
        },
      ],
    });
  });

  it('returns 400 for invalid JSON', async () => {
    const response = await POST(post('{'));

    expect(response.status).toBe(400);
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns the mapped checkout error', async () => {
    mockPrepare.mockRejectedValue(new Error('Email is required'));
    mockFailure.mockReturnValue({ status: 400, error: 'Email is required' });

    const response = await POST(post(address));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Email is required' });
  });

  it('returns 500 when preparation fails unexpectedly', async () => {
    mockPrepare.mockRejectedValue(new Error('upstream down'));
    mockFailure.mockReturnValue(null);

    const response = await POST(post(address));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to prepare checkout',
    });
  });
});
