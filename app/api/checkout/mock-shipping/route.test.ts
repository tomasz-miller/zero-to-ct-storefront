/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsEnabled, mockApply, mockFailure } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockApply: vi.fn(),
  mockFailure: vi.fn(),
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsEnabled,
  applyMockShippingMethod: mockApply,
  mockCheckoutFailure: mockFailure,
}));

import { POST } from './route';

function post(body: unknown) {
  return new Request('http://localhost/api/checkout/mock-shipping', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/checkout/mock-shipping', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockApply.mockReset();
    mockFailure.mockReset();
    mockIsEnabled.mockReturnValue(true);
  });

  it('returns 404 when mock payments are disabled', async () => {
    mockIsEnabled.mockReturnValue(false);

    const response = await POST(post({ shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(404);
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('returns the payable total for the selected method', async () => {
    mockApply.mockResolvedValue({
      total: { centAmount: 1680, currencyCode: 'EUR' },
    });

    const response = await POST(post({ shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(200);
    expect(mockApply).toHaveBeenCalledWith('ship-1');
    await expect(response.json()).resolves.toEqual({
      total: { centAmount: 1680, currencyCode: 'EUR' },
    });
  });

  it('returns a generic message when shipping update fails', async () => {
    mockApply.mockRejectedValue(new Error('scope missing'));
    mockFailure.mockReturnValue(null);

    const response = await POST(post({ shippingMethodId: 'ship-1' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to update shipping method',
    });
  });
});
