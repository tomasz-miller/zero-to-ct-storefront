/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CustomerError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

const { mockChangeCustomerPassword } = vi.hoisted(() => ({
  mockChangeCustomerPassword: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-profile', () => ({
  changeCustomerPassword: mockChangeCustomerPassword,
}));

import { POST } from './route';

const PASSWORD_URL = 'http://localhost/api/customer/password';
const createRequest = (body: unknown) => jsonRequest(PASSWORD_URL, body);

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
    mockChangeCustomerPassword.mockRejectedValue(
      new CustomerError(
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
