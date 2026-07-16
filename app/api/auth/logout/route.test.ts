/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockLogoutCustomer } = vi.hoisted(() => ({
  mockLogoutCustomer: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  logoutCustomer: mockLogoutCustomer,
}));

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockLogoutCustomer.mockReset();
  });

  it('returns ok on success', async () => {
    mockLogoutCustomer.mockResolvedValue(undefined);

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('returns 500 when logout fails', async () => {
    mockLogoutCustomer.mockRejectedValue(new Error('cookie clear failed'));

    const response = await POST();

    expect(response.status).toBe(500);
  });
});
