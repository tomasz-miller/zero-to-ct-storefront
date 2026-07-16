/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRegisterCustomer } = vi.hoisted(() => ({
  mockRegisterCustomer: vi.fn(),
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
  registerCustomer: mockRegisterCustomer,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockRegisterCustomer.mockReset();
  });

  it('returns 400 when first name is missing', async () => {
    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        password: 'password123',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns customer on successful registration', async () => {
    mockRegisterCustomer.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
    });

    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.customer.email).toBe('jane@example.com');
  });

  it('returns auth error status from CustomerAuthError', async () => {
    const { CustomerAuthError } = await import('@/lib/commercetools/customer-auth');
    mockRegisterCustomer.mockRejectedValue(
      new CustomerAuthError('DuplicateField', 'Email already registered', 409),
    );

    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(409);
  });
});
