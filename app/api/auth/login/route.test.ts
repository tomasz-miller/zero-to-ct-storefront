/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockLoginCustomer } = vi.hoisted(() => ({
  mockLoginCustomer: vi.fn(),
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
  loginCustomer: mockLoginCustomer,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockLoginCustomer.mockReset();
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(
      createRequest({ email: 'not-an-email', password: 'password123' }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    const { CustomerAuthError } = await import('@/lib/commercetools/customer-auth');
    mockLoginCustomer.mockRejectedValue(
      new CustomerAuthError('InvalidCredentials', 'Invalid email or password', 401),
    );

    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        password: 'wrong-password',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid email or password');
  });

  it('returns customer on successful login', async () => {
    mockLoginCustomer.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
    });

    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        password: 'password123',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.customer.email).toBe('jane@example.com');
  });
});
