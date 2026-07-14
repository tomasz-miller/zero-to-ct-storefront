/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockChangeCustomerPassword } = vi.hoisted(() => ({
  mockChangeCustomerPassword: vi.fn(),
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
  changeCustomerPassword: mockChangeCustomerPassword,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/customer/password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/customer/password', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockChangeCustomerPassword.mockReset();
  });

  it('returns 400 for short new password', async () => {
    const response = await POST(
      createRequest({
        currentPassword: 'OldPass123!',
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid current password', async () => {
    const { CustomerProfileError } = await import(
      '@/lib/commercetools/customer-profile-error'
    );
    mockChangeCustomerPassword.mockRejectedValue(
      new CustomerProfileError(
        'InvalidCurrentPassword',
        'Current password is incorrect',
        400,
      ),
    );

    const response = await POST(
      createRequest({
        currentPassword: 'wrong',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Current password is incorrect');
  });

  it('returns success and requires sign in', async () => {
    mockChangeCustomerPassword.mockResolvedValue(undefined);

    const response = await POST(
      createRequest({
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.requiresSignIn).toBe(true);
  });
});
