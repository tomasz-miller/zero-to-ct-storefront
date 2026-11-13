/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Customer } from '@commercetools/platform-sdk';

import { PublicError } from '@/lib/http/public-error';

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

import { CtFetchError } from './ct-errors';
import { CustomerError } from './domain-errors';
import {
  addCustomerAddress,
  changeCustomerPassword,
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

  it('changes email without querying customers by email', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());
    mockMeUpdateResponse(createCustomer({ email: 'new@example.com' }));

    await updateCustomerProfile({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'new@example.com',
    });

    expect(mockCustomersGet).not.toHaveBeenCalled();
    expect(JSON.stringify(mockFetch.mock.calls)).toContain('changeEmail');
  });

  it('maps duplicate field from update response', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statusCode: 409,
          errors: [{ code: 'DuplicateField', message: 'Duplicate' }],
        }),
        { status: 409 },
      ),
    );

    await expect(
      updateCustomerProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@example.com',
      }),
    ).rejects.toBeInstanceOf(CustomerError);
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

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statusCode: 400,
          errors: [{ code: 'InvalidCurrentPassword', message: 'Wrong password' }],
        }),
        { status: 400 },
      ),
    );

    await expect(
      changeCustomerPassword('wrong', 'NewPass123!'),
    ).rejects.toMatchObject({
      code: 'InvalidCurrentPassword',
      message: 'Current password is incorrect',
      status: 400,
    });
  });

  it('maps a raw 409 ConcurrentModification to a CustomerError', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());
    mockFetch.mockResolvedValueOnce(
      new Response(
        '{"errors":[{"code":"ConcurrentModification","message":"internal detail"}]}',
        { status: 409 },
      ),
    );
    const err = await updateCustomerProfile({ firstName: 'Janet' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CustomerError);
    expect(err).toMatchObject({
      status: 409,
      code: 'ConcurrentModification',
      message: 'Your profile was updated elsewhere. Refresh the page and try again.',
    });
  });

  it('rethrows other raw failures as CtFetchError', async () => {
    mockGetValidCustomerAccessToken.mockResolvedValue('token-1');
    mockMeResponse(createCustomer());
    mockFetch.mockResolvedValueOnce(
      new Response('{"errors":[{"code":"SomethingElse"}]}', { status: 400 }),
    );
    const err = await updateCustomerProfile({ firstName: 'Janet' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CtFetchError);
    expect(err).not.toBeInstanceOf(PublicError);
    expect(err).toMatchObject({ statusCode: 400 });
  });
});
