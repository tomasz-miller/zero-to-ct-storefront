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

  it('does not consume email-scoped limits for invalid emails', async () => {
    const attempt = (ip: string, email: string) =>
      POST(jsonRequest(LOGIN_URL, { email, password: 'password123' }, { headers: { 'x-forwarded-for': ip } }));
    // 31 empty emails from distinct clients would trip a shared 30/15 min email bucket.
    for (let i = 0; i < 31; i++) expect((await attempt(`10.0.0.${i + 1}`, '')).status).toBe(400);
    // 11 malformed emails from one client would trip the 10/15 min client-email bucket.
    for (let i = 0; i < 11; i++) expect((await attempt('9.9.9.9', 'not-an-email')).status).toBe(400);
    mockLoginCustomer.mockResolvedValue({ id: 'cust-1', email: 'jane@example.com', displayName: 'Jane' });
    expect((await attempt('9.9.9.9', 'jane@example.com')).status).toBe(200);
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

  const attemptFrom = (ip: string, password: string) =>
    POST(
      jsonRequest(
        LOGIN_URL,
        { email: 'owner@example.com', password },
        { headers: { 'x-forwarded-for': ip } },
      ),
    );

  it('caps guessing at 30 failed sign-ins per email across clients, even for the correct password', async () => {
    mockLoginCustomer.mockRejectedValue(
      new CustomerError('InvalidCredentials', 'Invalid email or password', 401),
    );
    for (let i = 0; i < 30; i++) expect((await attemptFrom(`10.0.0.${i + 1}`, 'wrong-pass')).status).toBe(401);
    mockLoginCustomer.mockResolvedValue({ id: 'cust-1', email: 'owner@example.com', displayName: 'Owner' });
    const blocked = await attemptFrom('10.9.9.9', 'right-pass');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
    expect(mockLoginCustomer).toHaveBeenCalledTimes(30);
  });

  it('lets only 30 concurrent attempts per email reach commercetools', async () => {
    const rejections: Array<(reason: unknown) => void> = [];
    mockLoginCustomer.mockImplementation(
      () => new Promise((_resolve, reject) => rejections.push(reject)),
    );
    const responses = Array.from({ length: 40 }, (_, i) =>
      attemptFrom(`10.0.0.${i + 1}`, 'wrong-pass'),
    );
    await vi.waitFor(() => expect(mockLoginCustomer).toHaveBeenCalledTimes(30));
    // Give the other ten requests time to reach (and be stopped before) the credential call.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockLoginCustomer).toHaveBeenCalledTimes(30);

    for (const reject of rejections) {
      reject(new CustomerError('InvalidCredentials', 'Invalid email or password', 401));
    }
    const statuses = (await Promise.all(responses)).map((response) => response.status);
    expect(statuses.filter((status) => status === 401)).toHaveLength(30);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
  });

  it('does not spend the per-email ceiling on commercetools errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLoginCustomer.mockRejectedValue(new Error('commercetools unavailable'));
    for (let i = 0; i < 40; i++) expect((await attemptFrom(`10.0.0.${i + 1}`, 'any-pass')).status).toBe(500);
  });

  it('does not refund failed guesses when the owner signs in', async () => {
    mockLoginCustomer.mockRejectedValue(
      new CustomerError('InvalidCredentials', 'Invalid email or password', 401),
    );
    for (let i = 0; i < 29; i++) expect((await attemptFrom(`10.0.0.${i + 1}`, 'wrong-pass')).status).toBe(401);
    mockLoginCustomer.mockResolvedValueOnce({ id: 'cust-1', email: 'owner@example.com', displayName: 'Owner' });
    expect((await attemptFrom('10.1.0.1', 'right-pass')).status).toBe(200);
    // Still 29 failures on record: one more reaches the cap and the next attempt is refused.
    expect((await attemptFrom('10.1.0.2', 'wrong-pass')).status).toBe(401);
    expect((await attemptFrom('10.1.0.3', 'right-pass')).status).toBe(429);
  });

  it('does not exhaust the per-email ceiling with successful sign-ins from many clients', async () => {
    mockLoginCustomer.mockResolvedValue({ id: 'cust-1', email: 'owner@example.com', displayName: 'Owner' });
    for (let i = 0; i < 40; i++) expect((await attemptFrom(`10.0.0.${i + 1}`, 'right-pass')).status).toBe(200);
  });

  it('lets the owner sign in while failed attempts from other clients stay below the cap', async () => {
    mockLoginCustomer.mockRejectedValue(
      new CustomerError('InvalidCredentials', 'Invalid email or password', 401),
    );
    for (let i = 0; i < 29; i++) expect((await attemptFrom(`10.0.0.${i + 1}`, 'wrong-pass')).status).toBe(401);
    mockLoginCustomer.mockResolvedValue({ id: 'cust-1', email: 'owner@example.com', displayName: 'Owner' });
    expect((await attemptFrom('10.9.9.9', 'right-pass')).status).toBe(200);
  });
});
