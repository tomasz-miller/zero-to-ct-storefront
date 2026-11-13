/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

const { mockGetLastOrderSession, mockWithOrderNumber, mockExecute } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockGet = vi.fn(() => ({ execute: mockExecute }));
  return {
    mockGetLastOrderSession: vi.fn(),
    mockWithOrderNumber: vi.fn(() => ({ get: mockGet })),
    mockExecute,
  };
});

vi.mock('./last-order-session', () => ({
  getLastOrderSession: mockGetLastOrderSession,
}));

vi.mock('./api-root', () => ({
  apiRoot: {
    orders: () => ({ withOrderNumber: mockWithOrderNumber }),
  },
}));

import { getConfirmedOrderForSession } from './order-confirmation';

const lastOrder = { orderNumber: 'ZT-20261113-0000ABCD', cartId: 'cart-1' };

describe('getConfirmedOrderForSession', () => {
  it('returns null without a last-order session', async () => {
    mockGetLastOrderSession.mockResolvedValueOnce(null);
    await expect(getConfirmedOrderForSession()).resolves.toBeNull();
    expect(mockWithOrderNumber).not.toHaveBeenCalled();
  });

  it('returns the order number when the order belongs to the session cart', async () => {
    mockGetLastOrderSession.mockResolvedValueOnce(lastOrder);
    mockExecute.mockResolvedValueOnce({
      body: { orderNumber: lastOrder.orderNumber, cart: { typeId: 'cart', id: 'cart-1' } },
    });
    await expect(getConfirmedOrderForSession()).resolves.toEqual({
      orderNumber: lastOrder.orderNumber,
    });
    expect(mockWithOrderNumber).toHaveBeenCalledWith({ orderNumber: lastOrder.orderNumber });
  });

  it('returns null when the order was placed from another cart', async () => {
    mockGetLastOrderSession.mockResolvedValueOnce(lastOrder);
    mockExecute.mockResolvedValueOnce({
      body: { orderNumber: lastOrder.orderNumber, cart: { typeId: 'cart', id: 'cart-2' } },
    });
    await expect(getConfirmedOrderForSession()).resolves.toBeNull();
  });

  it('returns null when the order number is unknown (404)', async () => {
    mockGetLastOrderSession.mockResolvedValueOnce(lastOrder);
    mockExecute.mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 }));
    await expect(getConfirmedOrderForSession()).resolves.toBeNull();
  });

  it('rethrows other commercetools errors', async () => {
    mockGetLastOrderSession.mockResolvedValueOnce(lastOrder);
    mockExecute.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }));
    await expect(getConfirmedOrderForSession()).rejects.toMatchObject({ statusCode: 500 });
  });
});
