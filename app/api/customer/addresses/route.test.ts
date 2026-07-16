/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAddCustomerAddress } = vi.hoisted(() => ({
  mockAddCustomerAddress: vi.fn(),
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
}));

vi.mock('@/lib/commercetools/customer-profile-error', () => ({
  CustomerProfileError: class CustomerProfileError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('@/lib/commercetools/customer-profile', () => ({
  addCustomerAddress: mockAddCustomerAddress,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/customer/addresses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validAddress = {
  firstName: 'Jane',
  lastName: 'Doe',
  streetName: 'Main St',
  postalCode: '10115',
  city: 'Berlin',
  country: 'DE',
};

describe('POST /api/customer/addresses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockAddCustomerAddress.mockReset();
  });

  it('returns 400 when street name is missing', async () => {
    const response = await POST(
      createRequest({ ...validAddress, streetName: '' }),
    );

    expect(response.status).toBe(400);
  });

  it('returns customer on success', async () => {
    mockAddCustomerAddress.mockResolvedValue({
      id: 'cust-1',
      addresses: [{ id: 'addr-1', ...validAddress }],
    });

    const response = await POST(createRequest(validAddress));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.customer.addresses).toHaveLength(1);
  });
});
