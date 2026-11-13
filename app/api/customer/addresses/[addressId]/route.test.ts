/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { CustomerError } from '@/lib/commercetools/domain-errors';
import { jsonRequest } from '@/test/helpers/json-request';

const { mockUpdateCustomerAddress, mockRemoveCustomerAddress } = vi.hoisted(
  () => ({
    mockUpdateCustomerAddress: vi.fn(),
    mockRemoveCustomerAddress: vi.fn(),
  }),
);

vi.mock('@/lib/commercetools/customer-profile', () => ({
  updateCustomerAddress: mockUpdateCustomerAddress,
  removeCustomerAddress: mockRemoveCustomerAddress,
}));

import { DELETE, PATCH } from './route';

const createPatchRequest = (body: unknown) =>
  jsonRequest('http://localhost/api/customer/addresses/addr-1', body, { method: 'PATCH' });

const context = { params: Promise.resolve({ addressId: 'addr-1' }) };

const validAddress = {
  firstName: 'Jane',
  lastName: 'Doe',
  streetName: 'Main St',
  postalCode: '10115',
  city: 'Berlin',
  country: 'DE',
};

describe('PATCH /api/customer/addresses/[addressId]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockUpdateCustomerAddress.mockReset();
    mockRemoveCustomerAddress.mockReset();
  });

  it('returns 400 for invalid country', async () => {
    const response = await PATCH(
      createPatchRequest({ ...validAddress, country: 'DEU' }),
      context,
    );

    expect(response.status).toBe(400);
  });

  it('returns updated customer on success', async () => {
    mockUpdateCustomerAddress.mockResolvedValue({
      id: 'cust-1',
      addresses: [{ id: 'addr-1', ...validAddress }],
    });

    const response = await PATCH(createPatchRequest(validAddress), context);

    expect(response.status).toBe(200);
    expect(mockUpdateCustomerAddress).toHaveBeenCalledWith(
      'addr-1',
      expect.objectContaining({ streetName: 'Main St', country: 'DE' }),
    );
  });
});

describe('DELETE /api/customer/addresses/[addressId]', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockUpdateCustomerAddress.mockReset();
    mockRemoveCustomerAddress.mockReset();
  });

  it('returns customer after deleting address', async () => {
    mockRemoveCustomerAddress.mockResolvedValue({
      id: 'cust-1',
      addresses: [],
    });

    const response = await DELETE(
      new NextRequest('http://localhost/api/customer/addresses/addr-1', {
        method: 'DELETE',
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mockRemoveCustomerAddress).toHaveBeenCalledWith('addr-1');
  });

  it('returns profile error status', async () => {
    mockRemoveCustomerAddress.mockRejectedValue(
      new CustomerError('Unauthorized', 'Sign in required', 401),
    );

    const response = await DELETE(
      new NextRequest('http://localhost/api/customer/addresses/addr-1', {
        method: 'DELETE',
      }),
      context,
    );

    expect(response.status).toBe(401);
  });
});
