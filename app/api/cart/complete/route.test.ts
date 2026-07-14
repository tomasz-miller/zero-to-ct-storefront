/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockClearCartSession } = vi.hoisted(() => ({
  mockClearCartSession: vi.fn(),
}));

vi.mock('@/lib/commercetools/cart-session', () => ({
  clearCartSession: mockClearCartSession,
}));

import { POST } from './route';

describe('POST /api/cart/complete', () => {
  afterEach(() => {
    mockClearCartSession.mockReset();
  });

  it('clears the active cart session after checkout completes', async () => {
    const response = await POST();

    expect(mockClearCartSession).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ itemCount: 0 });
  });
});
