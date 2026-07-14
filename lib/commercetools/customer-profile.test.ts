/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Customer } from '@commercetools/platform-sdk';

const {
  mockGetValidCustomerAccessToken,
  mockCustomersGet,
  mockClearCustomerSession,
  mockClearCartSession,
  mockFetch,
} = vi.hoisted(() => ({
  mockGetValidCustomerAccessToken: vi.fn(),
  mockCustomersGet: vi.fn(),
  mockClearCustomerSession: vi.fn(),
  mockClearCartSession: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('./customer-auth', () => ({
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
  getValidCustomerAccessToken: mockGetValidCustomerAccessToken,
}));

vi.mock('./customer-session', () => ({
  clearCustomerSession: mockClearCustomerSession,
}));

vi.mock('./cart-session', () => ({
  clearCartSession: mockClearCartSession,
}));

vi.mock('./api-root', () => ({
  apiRoot: {
    customers: vi.fn(() => ({
      get: mockCustomersGet,
    })),
  },
}));

vi.mock('./env', () => ({
  commercetoolsEnv: {
    apiUrl: 'https://api.example.com',
    projectKey: 'demo-project',
  },
}));

import { CustomerProfileError } from './customer-profile-error';
import {
  addCustomerAddress,
  changeCustomerPassword,
  isCustomerEmailAvailable,
  removeCustomerAddress,
  updateCustomerProfile,
} from './customer-profile';

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    version: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
    addresses: [],
    shippingAddressIds: [],
    billingAddressIds: [],
    customerGroupAssignments: [],
    stores: [],
    isEmailVerified: true,
    authenticationMode: 'Password',
    ...overrides,
  };
}

function mockMeResponse(customer: Customer) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(customer),
  });
}

function mockMeUpdateResponse(customer: Customer) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(customer),
  });
}

describe('customer-profile', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockGetValidCustomerAccessToken.mockReset();
    mockCustomersGet.mockReset();
    mockClearCustomerSession.mockReset();
    mockClearCartSession.mockReset();
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it('checks email availability excluding current customer', async () => {
    mockCustomersGet.mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        body: { results: [] },
      }),
    });

    await expect(
      isCustomerEmailAvailable('New@Example.com', 'cust-1'),
    ).resolves.toBe(true);

    expect(mockCustomersGet).toHaveBeenCalledWith({
      queryArgs: {
        where: 'lowercaseEmail="new@example.com" and id!="cust-1"',
        limit: 1,
      },
    });
  });

  it('updates profile with changed fields only', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockCustomersGet.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ body: { results: [] } }),
    });

    mockMeUpdateResponse(
      createCustomer({
        firstName: 'Janet',
        version: 4,
      }),
    );

    const result = await updateCustomerProfile({
      firstName: 'Janet',
      lastName: 'Doe',
      email: 'jane@example.com',
    });

    expect(result.firstName).toBe('Janet');
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://api.example.com/demo-project/me',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          version: 3,
          actions: [{ action: 'setFirstName', firstName: 'Janet' }],
        }),
      }),
    );
  });

  it('rejects duplicate email before update', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockCustomersGet.mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        body: { results: [{ id: 'other-customer' }] },
      }),
    });

    await expect(
      updateCustomerProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'DuplicateField',
      statusCode: 409,
    });
  });

  it('maps duplicate field from update response', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockCustomersGet.mockReturnValue({
      execute: vi.fn().mockResolvedValue({ body: { results: [] } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          statusCode: 409,
          errors: [{ code: 'DuplicateField', message: 'Duplicate' }],
        }),
    });

    await expect(
      updateCustomerProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@example.com',
      }),
    ).rejects.toBeInstanceOf(CustomerProfileError);
  });

  it('adds address with default flags', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockMeUpdateResponse(
      createCustomer({
        version: 4,
        addresses: [
          {
            id: 'addr-1',
            streetName: 'Main Street',
            streetNumber: '42',
            postalCode: '10115',
            city: 'Berlin',
            country: 'DE',
          },
        ],
        defaultShippingAddressId: 'addr-1',
        defaultBillingAddressId: 'addr-1',
      }),
    );

    const result = await addCustomerAddress({
      streetName: 'Main Street',
      streetNumber: '42',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    expect(result.addresses).toHaveLength(1);
    const updateCall = mockFetch.mock.calls[1];
    const body = JSON.parse(updateCall?.[1]?.body as string) as {
      actions: Array<{ action: string }>;
    };
    expect(body.actions.map((action) => action.action)).toEqual([
      'addAddress',
      'setDefaultShippingAddress',
      'setDefaultBillingAddress',
    ]);
  });

  it('removes address when it exists', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(
      createCustomer({
        addresses: [
          {
            id: 'addr-1',
            streetName: 'Main Street',
            postalCode: '10115',
            city: 'Berlin',
            country: 'DE',
          },
        ],
      }),
    );

    mockMeUpdateResponse(createCustomer({ version: 4, addresses: [] }));

    const result = await removeCustomerAddress('addr-1');
    expect(result.addresses).toEqual([]);
  });

  it('changes password and clears sessions', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(createCustomer({ version: 4 })),
    });

    await changeCustomerPassword('OldPass123!', 'NewPass123!');

    expect(mockClearCustomerSession).toHaveBeenCalled();
    expect(mockClearCartSession).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://api.example.com/demo-project/me/password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          version: 3,
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        }),
      }),
    );
  });

  it('maps invalid current password', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          statusCode: 400,
          errors: [{ code: 'InvalidCurrentPassword', message: 'Wrong password' }],
        }),
    });

    await expect(
      changeCustomerPassword('wrong', 'NewPass123!'),
    ).rejects.toMatchObject({
      code: 'InvalidCurrentPassword',
      message: 'Current password is incorrect',
      statusCode: 400,
    });
  });
});
