/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CustomerError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

const { mockResetCustomerPassword } = vi.hoisted(() => ({
  mockResetCustomerPassword: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  resetCustomerPassword: mockResetCustomerPassword,
}));

import { POST } from './route';

const RESET_URL = 'http://localhost/api/auth/reset-password';

describe('POST /api/auth/reset-password', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockResetCustomerPassword.mockReset();
  });

  it('returns 400 when token is missing', async () => {
    const response = await POST(
      jsonRequest(RESET_URL, { newPassword: 'password123' }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-string token', async () => {
    expect(
      (await POST(jsonRequest(RESET_URL, { token: 5, newPassword: 'password123' }))).status,
    ).toBe(400);
  });

  it('returns success message on password update', async () => {
    mockResetCustomerPassword.mockResolvedValue(undefined);

    const response = await POST(
      jsonRequest(RESET_URL, { token: 'reset-tok', newPassword: 'password123' }),
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
    mockResetCustomerPassword.mockRejectedValue(
      new CustomerError(
        'ExpiredCustomerPasswordToken',
        'Password reset link is invalid or expired',
        400,
      ),
    );

    const response = await POST(
      jsonRequest(RESET_URL, { token: 'bad', newPassword: 'password123' }),
    );

    expect(response.status).toBe(400);
  });
});
