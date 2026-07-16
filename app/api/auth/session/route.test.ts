/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetAuthenticatedCustomerProfile } = vi.hoisted(() => ({
  mockGetAuthenticatedCustomerProfile: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  CustomerAuthError: class CustomerAuthError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  getAuthenticatedCustomerProfile: mockGetAuthenticatedCustomerProfile,
}));

import { GET } from './route';

describe('GET /api/auth/session', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetAuthenticatedCustomerProfile.mockReset();
  });

  it('returns customer when authenticated', async () => {
    mockGetAuthenticatedCustomerProfile.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.customer.id).toBe('cust-1');
  });

  it('returns 401 when not authenticated', async () => {
    const { CustomerAuthError } = await import('@/lib/commercetools/customer-auth');
    mockGetAuthenticatedCustomerProfile.mockRejectedValue(
      new CustomerAuthError('Unauthorized', 'Not signed in', 401),
    );

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
