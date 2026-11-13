/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomerError } from '@/lib/commercetools/domain-errors';
import { resetAuthRateLimits } from '@/lib/http/auth-rate-limits';
import { jsonRequest } from '@/test/helpers/json-request';

const { mockRegisterCustomer } = vi.hoisted(() => ({
  mockRegisterCustomer: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  registerCustomer: mockRegisterCustomer,
}));

import { POST } from './route';

const REGISTER_URL = 'http://localhost/api/auth/register';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    resetAuthRateLimits();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockRegisterCustomer.mockReset();
  });

  it('returns 400 when first name is missing', async () => {
    const response = await POST(
      jsonRequest(REGISTER_URL, {
        email: 'jane@example.com',
        password: 'password123',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-string first name', async () => {
    expect(
      (
        await POST(
          jsonRequest(REGISTER_URL, {
            email: 'jane@example.com',
            password: 'password123',
            firstName: 1,
          }),
        )
      ).status,
    ).toBe(400);
  });

  it('returns customer on successful registration', async () => {
    mockRegisterCustomer.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
    });

    const response = await POST(
      jsonRequest(REGISTER_URL, {
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

  it('returns the status of a CustomerError', async () => {
    mockRegisterCustomer.mockRejectedValue(
      new CustomerError('DuplicateField', 'Email already registered', 409),
    );

    const response = await POST(
      jsonRequest(REGISTER_URL, {
        email: 'jane@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    );

    expect(response.status).toBe(409);
  });

  it('maps DuplicateField to 409 with fixed copy', async () => {
    mockRegisterCustomer.mockRejectedValue(
      new CustomerError('DuplicateField', 'An account with this email already exists', 409),
    );
    const res = await POST(
      jsonRequest(REGISTER_URL, {
        email: 'jane@example.com',
        password: 'password123',
        firstName: 'J',
        lastName: 'D',
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('An account with this email already exists');
  });
});
