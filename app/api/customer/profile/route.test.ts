/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUpdateCustomerProfile } = vi.hoisted(() => ({
  mockUpdateCustomerProfile: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  CustomerAuthError: class CustomerAuthError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.name = 'CustomerAuthError';
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('@/lib/commercetools/customer-profile-error', () => ({
  CustomerProfileError: class CustomerProfileError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.name = 'CustomerProfileError';
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('@/lib/commercetools/customer-profile', () => ({
  updateCustomerProfile: mockUpdateCustomerProfile,
}));

import { PATCH } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/customer/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/customer/profile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockUpdateCustomerProfile.mockReset();
  });

  it('returns 400 for invalid email', async () => {
    const response = await PATCH(
      createRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'invalid',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    const { CustomerProfileError } = await import(
      '@/lib/commercetools/customer-profile-error'
    );
    mockUpdateCustomerProfile.mockRejectedValue(
      new CustomerProfileError(
        'DuplicateField',
        'An account with this email already exists',
        409,
      ),
    );

    const response = await PATCH(
      createRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@example.com',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toContain('already exists');
  });

  it('returns updated customer on success', async () => {
    mockUpdateCustomerProfile.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      addresses: [],
    });

    const response = await PATCH(
      createRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.customer.displayName).toBe('Jane Doe');
  });
});
