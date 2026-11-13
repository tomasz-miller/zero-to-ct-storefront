/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomerError } from '@/lib/commercetools/domain-errors';
import { resetAuthRateLimits } from '@/lib/http/auth-rate-limits';
import { jsonRequest } from '@/test/helpers/json-request';

const { mockLoginCustomer } = vi.hoisted(() => ({
  mockLoginCustomer: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  loginCustomer: mockLoginCustomer,
}));

import { POST } from './route';

const LOGIN_URL = 'http://localhost/api/auth/login';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    resetAuthRateLimits();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockLoginCustomer.mockReset();
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(
      jsonRequest(LOGIN_URL, { email: 'not-an-email', password: 'password123' }),
    );

    expect(response.status).toBe(400);
  });

  it.each([[null], [{ email: 1, password: 'x' }], [[]]])('returns 400 for %j', async (b) => {
    expect((await POST(jsonRequest(LOGIN_URL, b))).status).toBe(400);
    expect(mockLoginCustomer).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid credentials', async () => {
    mockLoginCustomer.mockRejectedValue(
      new CustomerError('InvalidCredentials', 'Invalid email or password', 401),
    );

    const response = await POST(
      jsonRequest(LOGIN_URL, {
        email: 'jane@example.com',
        password: 'wrong-password',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid email or password');
  });

  it('does not forward unknown commercetools errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLoginCustomer.mockRejectedValue(
      Object.assign(new Error('insufficient_scope: manage_customers'), {
        statusCode: 403,
        body: { message: 'insufficient_scope' },
      }),
    );
    const res = await POST(
      jsonRequest(LOGIN_URL, { email: 'jane@example.com', password: 'password123' }),
    );
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('insufficient_scope');
  });

  it('returns customer on successful login', async () => {
    mockLoginCustomer.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
    });

    const response = await POST(
      jsonRequest(LOGIN_URL, {
        email: 'jane@example.com',
        password: 'password123',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.customer.email).toBe('jane@example.com');
  });

  it('locks out after 5 invalid credentials without calling commercetools again', async () => {
    mockLoginCustomer.mockRejectedValue(
      new CustomerError('InvalidCredentials', 'Invalid email or password', 401),
    );
    const attempt = () =>
      POST(jsonRequest(LOGIN_URL, { email: 'jane@example.com', password: 'wrong-pass' }));
    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);
    const sixth = await attempt();
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get('Retry-After')).not.toBeNull();
    expect(mockLoginCustomer).toHaveBeenCalledTimes(5);
  });
});
