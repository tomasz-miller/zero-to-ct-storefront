/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CustomerError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

const { mockUpdateCustomerProfile } = vi.hoisted(() => ({
  mockUpdateCustomerProfile: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-profile', () => ({
  updateCustomerProfile: mockUpdateCustomerProfile,
}));

import { PATCH } from './route';

const PROFILE_URL = 'http://localhost/api/customer/profile';
const createRequest = (body: unknown) =>
  jsonRequest(PROFILE_URL, body, { method: 'PATCH' });

describe('PATCH /api/customer/profile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockUpdateCustomerProfile.mockReset();
  });

  it('returns 400 for invalid email', async () => {
    const response = await PATCH(
      createRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'invalid',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    mockUpdateCustomerProfile.mockRejectedValue(
      new CustomerError(
        'DuplicateField',
        'An account with this email already exists',
        409,
      ),
    );

    const response = await PATCH(
      createRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@example.com',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toContain('already exists');
  });

  it('returns updated customer on success', async () => {
    mockUpdateCustomerProfile.mockResolvedValue({
      id: 'cust-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      addresses: [],
    });

    const response = await PATCH(
      createRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.customer.displayName).toBe('Jane Doe');
  });
});
