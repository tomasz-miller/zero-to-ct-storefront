/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsEnabled, mockPrepare } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockPrepare: vi.fn(),
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsEnabled,
  prepareMockCheckout: mockPrepare,
}));

import { MockCheckoutError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

import { POST } from './route';

const ENDPOINT = 'http://localhost/api/checkout/mock-prepare';

const address = {
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  streetName: 'Demo Street',
  postalCode: '10115',
  city: 'Berlin',
};

describe('POST /api/checkout/mock-prepare', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockPrepare.mockReset();
    mockIsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when mock payments are disabled', async () => {
    mockIsEnabled.mockReturnValue(false);

    const response = await POST(jsonRequest(ENDPOINT, address));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('Mock payments are disabled');
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

    const response = await POST(jsonRequest(ENDPOINT, address));

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
    const response = await POST(jsonRequest(ENDPOINT, '{'));

    expect(response.status).toBe(400);
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns the mapped checkout error', async () => {
    mockPrepare.mockRejectedValue(new MockCheckoutError('Email is required'));

    const response = await POST(jsonRequest(ENDPOINT, address));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Email is required',
      code: 'MockCheckoutFailed',
    });
  });

  it('returns a generic 500 when preparation fails unexpectedly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrepare.mockRejectedValue(new Error('upstream down'));

    const response = await POST(jsonRequest(ENDPOINT, address));
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
