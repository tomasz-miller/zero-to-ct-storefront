/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Customer,
  MyCustomerChangePassword,
  MyCustomerUpdate,
} from '@commercetools/platform-sdk';

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

const {
  mockCreateCustomerApiRoot,
  meGetExecute,
  mePost,
  mePostExecute,
  mePasswordPost,
  mePasswordExecute,
} = vi.hoisted(() => {
  const meGetExecute = vi.fn();
  const mePostExecute = vi.fn();
  const mePost = vi.fn<(args: { body: MyCustomerUpdate }) => { execute: typeof mePostExecute }>(() => ({ execute: mePostExecute }));
  const mePasswordExecute = vi.fn();
  const mePasswordPost = vi.fn<(args: { body: MyCustomerChangePassword }) => { execute: typeof mePasswordExecute }>(() => ({ execute: mePasswordExecute }));
  const meChain = {
    me: () => ({
      get: () => ({ execute: meGetExecute }),
      post: mePost,
      password: () => ({ post: mePasswordPost }),
    }),
  };
  return { mockCreateCustomerApiRoot: vi.fn(() => meChain), meGetExecute, mePost, mePostExecute, mePasswordPost, mePasswordExecute };
});

vi.mock('./customer-client', () => ({ createCustomerApiRoot: mockCreateCustomerApiRoot }));

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

function ctError(statusCode: number, code = 'Error', message = 'ct') {
  return Object.assign(new Error(message), {
    statusCode,
    code,
    body: { statusCode, message, errors: [{ code, message }] },
  });
}

function mockMeResponse(customer: Customer) {
  meGetExecute.mockResolvedValueOnce({ body: customer });
}

function mockMeUpdateResponse(customer: Customer) {
  mePostExecute.mockResolvedValueOnce({ body: customer });
}

describe('customer-profile', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockGetValidCustomerAccessToken.mockResolvedValue('tok-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockGetValidCustomerAccessToken.mockReset();
    mockCustomersGet.mockReset();
    mockClearCustomerSession.mockReset();
    mockClearCartSession.mockReset();
    mockFetch.mockReset();
    meGetExecute.mockReset();
    mePostExecute.mockReset();
    mePasswordExecute.mockReset();
    vi.unstubAllGlobals();
  });

  it('updates profile with changed fields only', async () => {
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
    expect(mePost).toHaveBeenLastCalledWith({
      body: { version: 3, actions: [{ action: 'setFirstName', firstName: 'Janet' }] },
    });
  });

  it('changes email without querying customers by email', async () => {
    mockMeResponse(createCustomer());
    mockMeUpdateResponse(createCustomer({ email: 'new@example.com' }));

    await updateCustomerProfile({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'new@example.com',
    });

    expect(mockCustomersGet).not.toHaveBeenCalled();
    expect(JSON.stringify(mePost.mock.calls)).toContain('changeEmail');
  });

  it('maps duplicate field from update response', async () => {
    mockMeResponse(createCustomer());

    mePostExecute.mockRejectedValueOnce(ctError(409, 'DuplicateField', 'Duplicate'));

    await expect(
      updateCustomerProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@example.com',
      }),
    ).rejects.toBeInstanceOf(CustomerError);
  });

  it('adds address with default flags', async () => {
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
    const body = mePost.mock.calls[0][0].body;
    expect(body.actions.map((action) => action.action)).toEqual([
      'addAddress',
      'setDefaultShippingAddress',
      'setDefaultBillingAddress',
    ]);
  });

  it('removes address when it exists', async () => {
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
    mockMeResponse(createCustomer());

    mePasswordExecute.mockResolvedValueOnce({ body: createCustomer({ version: 4 }) });

    await changeCustomerPassword('OldPass123!', 'NewPass123!');

    expect(mockClearCustomerSession).toHaveBeenCalled();
    expect(mockClearCartSession).toHaveBeenCalled();
    expect(mePasswordPost).toHaveBeenCalledWith({
      body: { version: 3, currentPassword: 'OldPass123!', newPassword: 'NewPass123!' },
    });
  });

  it('maps invalid current password', async () => {
    mockMeResponse(createCustomer());

    mePasswordExecute.mockRejectedValueOnce(ctError(400, 'InvalidCurrentPassword', 'Wrong password'));

    await expect(
      changeCustomerPassword('wrong', 'NewPass123!'),
    ).rejects.toMatchObject({
      code: 'InvalidCurrentPassword',
      message: 'Current password is incorrect',
      status: 400,
    });
  });

  it('maps a raw 409 ConcurrentModification to a CustomerError', async () => {
    mockMeResponse(createCustomer());
    mePostExecute.mockRejectedValueOnce(ctError(409, 'ConcurrentModification', 'internal detail'));
    const err = await updateCustomerProfile({ firstName: 'Janet' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CustomerError);
    expect(err).toMatchObject({
      status: 409,
      code: 'ConcurrentModification',
      message: 'Your profile was updated elsewhere. Refresh the page and try again.',
    });
  });

  it('rethrows other SDK failures unchanged', async () => {
    mockMeResponse(createCustomer());
    const original = ctError(400, 'SomethingElse');
    mePostExecute.mockRejectedValueOnce(original);
    const err = await updateCustomerProfile({ firstName: 'Janet' }).catch((e: unknown) => e);
    expect(err).toBe(original);
    expect(err).not.toBeInstanceOf(PublicError);
  });

  it('changes the password through me().password() without raw fetch', async () => {
    meGetExecute.mockResolvedValue({ body: { id: 'cust-1', version: 5 } });
    await changeCustomerPassword('old', 'new');
    expect(mePasswordPost).toHaveBeenCalledWith({ body: { version: 5, currentPassword: 'old', newPassword: 'new' } });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('maps InvalidCurrentPassword from the SDK error', async () => {
    meGetExecute.mockResolvedValue({ body: { id: 'cust-1', version: 5 } });
    mePasswordExecute.mockRejectedValueOnce(ctError(400, 'InvalidCurrentPassword'));
    const error = await changeCustomerPassword('bad', 'new').catch((e) => e);
    expect(error).toBeInstanceOf(CustomerError);
    expect(error).toMatchObject({ status: 400, message: 'Current password is incorrect' });
  });

  it('maps a /me 409 to the profile conflict CustomerError', async () => {
    // createCustomer (customer-profile.test.ts:60) supplies email; updateCustomerProfile compares it before the POST.
    meGetExecute.mockResolvedValue({ body: createCustomer({ version: 5 }) });
    mePostExecute.mockRejectedValueOnce(ctError(409, 'ConcurrentModification'));
    await expect(updateCustomerProfile({ firstName: 'A', lastName: 'B', email: 'a@example.com' })).rejects.toMatchObject({ status: 409 });
    expect(mePostExecute).toHaveBeenCalledTimes(1);
  });

  // Owner decision 2026-11-16: an expired or revoked token answers like a missing session.
  it('maps a /me 401 to the sign-in-required CustomerError', async () => {
    meGetExecute.mockRejectedValueOnce(ctError(401, 'invalid_token'));
    const error = await updateCustomerProfile({ firstName: 'A', lastName: 'B', email: 'a@example.com' }).catch((e) => e);
    expect(error).toBeInstanceOf(CustomerError);
    expect(error).toMatchObject({ code: 'Unauthorized', status: 401, message: 'Sign in required' });
    expect(mePostExecute).not.toHaveBeenCalled();
  });
});
