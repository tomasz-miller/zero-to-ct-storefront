/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsEnabled, mockApply } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockApply: vi.fn(),
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsEnabled,
  applyMockShippingMethod: mockApply,
}));

import { jsonRequest } from '@/test/helpers/json-request';

import { POST } from './route';

const ENDPOINT = 'http://localhost/api/checkout/mock-shipping';

describe('POST /api/checkout/mock-shipping', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockApply.mockReset();
    mockIsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when mock payments are disabled', async () => {
    mockIsEnabled.mockReturnValue(false);

    const response = await POST(jsonRequest(ENDPOINT, { shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('Mock payments are disabled');
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('returns the payable total for the selected method', async () => {
    mockApply.mockResolvedValue({
      total: { centAmount: 1680, currencyCode: 'EUR' },
    });

    const response = await POST(jsonRequest(ENDPOINT, { shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(200);
    expect(mockApply).toHaveBeenCalledWith('ship-1');
    await expect(response.json()).resolves.toEqual({
      total: { centAmount: 1680, currencyCode: 'EUR' },
    });
  });

  it('returns a generic message when shipping update fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApply.mockRejectedValue(new Error('scope missing'));

    const response = await POST(jsonRequest(ENDPOINT, { shippingMethodId: 'ship-1' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(body)).not.toContain('scope missing');
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
