/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAddDiscountCode, mockRemoveDiscountCode } = vi.hoisted(() => ({
  mockAddDiscountCode: vi.fn(),
  mockRemoveDiscountCode: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart', () => ({
  addDiscountCode: mockAddDiscountCode,
  removeDiscountCode: mockRemoveDiscountCode,
  CartAccessError: class CartAccessError extends Error {},
  CartNotFoundError: class CartNotFoundError extends Error {},
}));

vi.mock('@/lib/commercetools/cart-discount-errors', async () => {
  const actual = await vi.importActual('@/lib/commercetools/cart-discount-errors');
  return actual;
});

import {
  DiscountCodeNotApplicableError,
  InvalidDiscountCodeError,
} from '@/lib/commercetools/cart-discount-errors';
import { DELETE, POST } from './route';

const sampleCart = {
  id: 'cart-1',
  version: 1,
  currency: 'EUR',
  lineItems: [],
  itemCount: 1,
  discountCodes: [{ id: 'dc-1', code: 'BOGO', state: 'MatchesCart' }],
  subtotal: { centAmount: 99800, currencyCode: 'EUR' },
  total: { centAmount: 6799, currencyCode: 'EUR' },
  savings: { centAmount: 93001, currencyCode: 'EUR' },
};

function createRequest(method: 'POST' | 'DELETE', body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/cart/discount-code', {
    method,
    body: JSON.stringify(body),
  });
}

describe('/api/cart/discount-code', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockAddDiscountCode.mockReset();
    mockRemoveDiscountCode.mockReset();
  });

  it('returns 400 when code is missing', async () => {
    const response = await POST(createRequest('POST', {}));
    expect(response.status).toBe(400);
  });

  it('applies discount code', async () => {
    mockAddDiscountCode.mockResolvedValue(sampleCart);

    const response = await POST(createRequest('POST', { code: 'BOGO' }));

    expect(response.status).toBe(200);
    expect(mockAddDiscountCode).toHaveBeenCalledWith('BOGO');
  });

  it('returns 422 for non-applicable discount code', async () => {
    mockAddDiscountCode.mockRejectedValue(
      new DiscountCodeNotApplicableError('Code does not apply'),
    );

    const response = await POST(createRequest('POST', { code: 'BOGO' }));
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toMatch(/does not apply/i);
  });

  it('returns 422 for invalid discount code', async () => {
    mockAddDiscountCode.mockRejectedValue(
      new InvalidDiscountCodeError('Discount code not found'),
    );

    const response = await POST(createRequest('POST', { code: 'NOPE' }));
    expect(response.status).toBe(422);
  });

  it('removes discount code', async () => {
    mockRemoveDiscountCode.mockResolvedValue({ ...sampleCart, discountCodes: [] });

    const response = await DELETE(
      createRequest('DELETE', { discountCodeId: 'dc-1' }),
    );

    expect(response.status).toBe(200);
    expect(mockRemoveDiscountCode).toHaveBeenCalledWith('dc-1');
  });
});
