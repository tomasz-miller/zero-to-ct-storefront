/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest } from '@/test/helpers/json-request';

const { mockAddCustomerAddress } = vi.hoisted(() => ({
  mockAddCustomerAddress: vi.fn(),
}));

vi.mock('@/lib/commercetools/customer-profile', () => ({
  addCustomerAddress: mockAddCustomerAddress,
}));

import { POST } from './route';

const ADDRESSES_URL = 'http://localhost/api/customer/addresses';
const createRequest = (body: unknown) => jsonRequest(ADDRESSES_URL, body);

const validAddress = {
  firstName: 'Jane',
  lastName: 'Doe',
  streetName: 'Main St',
  postalCode: '10115',
  city: 'Berlin',
  country: 'DE',
};

describe('POST /api/customer/addresses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockAddCustomerAddress.mockReset();
  });

  it('returns 400 when street name is missing', async () => {
    const response = await POST(
      createRequest({ ...validAddress, streetName: '' }),
    );

    expect(response.status).toBe(400);
  });

  it.each([[{ isDefaultShipping: 'yes' }], [{ streetName: 7 }]])('returns 400 for %j', async (body) => {
    expect((await POST(jsonRequest('http://localhost/api/customer/addresses', body))).status).toBe(400);
    expect(mockAddCustomerAddress).not.toHaveBeenCalled();
  });

  it('returns customer on success', async () => {
    mockAddCustomerAddress.mockResolvedValue({
      id: 'cust-1',
      addresses: [{ id: 'addr-1', ...validAddress }],
    });

    const response = await POST(createRequest(validAddress));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.customer.addresses).toHaveLength(1);
  });
});
