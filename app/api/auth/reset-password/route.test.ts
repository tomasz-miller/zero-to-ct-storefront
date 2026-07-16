/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockResetCustomerPassword } = vi.hoisted(() => ({
  mockResetCustomerPassword: vi.fn(),
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
  resetCustomerPassword: mockResetCustomerPassword,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/reset-password', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockResetCustomerPassword.mockReset();
  });

  it('returns 400 when token is missing', async () => {
    const response = await POST(
      createRequest({ newPassword: 'password123' }),
    );

    expect(response.status).toBe(400);
  });

  it('returns success message on password update', async () => {
    mockResetCustomerPassword.mockResolvedValue(undefined);

    const response = await POST(
      createRequest({ token: 'reset-tok', newPassword: 'password123' }),
    );

    expect(response.status).toBe(200);
    expect(mockResetCustomerPassword).toHaveBeenCalledWith(
      'reset-tok',
      'password123',
    );
    const body = await response.json();
    expect(body.message).toMatch(/password updated/i);
  });

  it('returns auth error for invalid token', async () => {
    const { CustomerAuthError } = await import('@/lib/commercetools/customer-auth');
    mockResetCustomerPassword.mockRejectedValue(
      new CustomerAuthError('InvalidToken', 'Token expired', 400),
    );

    const response = await POST(
      createRequest({ token: 'bad', newPassword: 'password123' }),
    );

    expect(response.status).toBe(400);
  });
});
