/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ctErr } from '@/test/helpers/ct-error';

// Pins login and register end to end with the REAL ./shopping-lists module (customer-auth.test.ts mocks it).
const {
  mockExecute,
  mockLoginPost,
  mockCustomersPost,
  mockShoppingListGetExecute,
  mockSetCustomerSession,
  mockRequestCustomerPasswordToken,
  mockRevokeCustomerRefreshToken,
  mockRevokeCustomerAccessToken,
  mockGetWishlistSession,
  mockSetWishlistSession,
  mockClearWishlistSession,
  mockRotateWishlistSessionAnonymousId,
} = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockLoginPost: vi.fn(() => ({ execute: mockExecute })),
  mockCustomersPost: vi.fn(() => ({ execute: mockExecute })),
  mockShoppingListGetExecute: vi.fn(),
  mockSetCustomerSession: vi.fn(),
  mockRequestCustomerPasswordToken: vi.fn(),
  mockRevokeCustomerRefreshToken: vi.fn(),
  mockRevokeCustomerAccessToken: vi.fn(),
  mockGetWishlistSession: vi.fn<
    () => Promise<{ anonymousId: string; shoppingListId: string } | null>
  >(async () => ({ anonymousId: 'anon-w', shoppingListId: 'list-g' })),
  mockSetWishlistSession: vi.fn(),
  mockClearWishlistSession: vi.fn(),
  mockRotateWishlistSessionAnonymousId: vi.fn(),
}));

vi.mock('./api-root', () => ({
  apiRoot: {
    login: vi.fn(() => ({ post: mockLoginPost })),
    customers: vi.fn(() => ({ post: mockCustomersPost })),
    shoppingLists: vi.fn(() => ({
      withId: vi.fn(() => ({
        get: vi.fn(() => ({ execute: mockShoppingListGetExecute })),
      })),
    })),
  },
}));

vi.mock('./cart', () => ({
  getOwnedGuestCartRef: vi.fn(async (): Promise<null> => null),
  reconcileCartOnAuth: vi.fn(),
  restoreCustomerCartSession: vi.fn(),
  addLineItem: vi.fn(),
}));

vi.mock('./cart-session', () => ({
  getCartSession: vi.fn(),
  setCartSession: vi.fn(),
  createAnonymousId: vi.fn(() => 'anon-rotated'),
  rotateCartSessionAnonymousId: vi.fn(),
  clearCartSession: vi.fn(),
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: vi.fn(),
  setCustomerSession: mockSetCustomerSession,
  clearCustomerSession: vi.fn(),
}));

vi.mock('./customer-client', () => ({ createCustomerApiRoot: vi.fn() }));

vi.mock('./customer-token', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./customer-token')>()),
  refreshCustomerSession: vi.fn(),
  requestCustomerPasswordToken: mockRequestCustomerPasswordToken,
  revokeCustomerRefreshToken: mockRevokeCustomerRefreshToken,
  revokeCustomerAccessToken: mockRevokeCustomerAccessToken,
}));

vi.mock('./market-cart-session', () => ({ clearMarketCartMap: vi.fn() }));
vi.mock('./last-order-session', () => ({ clearLastOrderSession: vi.fn() }));

vi.mock('./storefront-context', () => ({
  getStorefrontContext: async () => ({ locale: 'en-GB', currency: 'EUR', country: 'DE' }),
}));

vi.mock('./wishlist-session', () => ({
  getWishlistSession: mockGetWishlistSession,
  setWishlistSession: mockSetWishlistSession,
  clearWishlistSession: mockClearWishlistSession,
  createWishlistAnonymousId: vi.fn(() => 'anon-new'),
  rotateWishlistSessionAnonymousId: mockRotateWishlistSessionAnonymousId,
}));

vi.mock('./env', () => ({
  commercetoolsEnv: {
    authUrl: 'https://auth.example.com',
    apiUrl: 'https://api.example.com',
    projectKey: 'demo-project',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    customerScopes: 'manage_my_profile:demo-project manage_my_orders:demo-project',
  },
}));

import { loginCustomer, registerCustomer } from './customer-auth';

const customer = {
  id: 'cust-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastModifiedAt: '2026-01-01T00:00:00.000Z',
  addresses: [],
  isEmailVerified: false,
  authenticationMode: 'Password',
};

describe('sign-in when the guest wishlist read fails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockExecute.mockResolvedValue({ body: { customer } });
    mockRequestCustomerPasswordToken.mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: 9e12,
      scope: 'customer_id:cust-1',
    });
    mockShoppingListGetExecute.mockRejectedValue(ctErr('ServiceUnavailable', 'ct', 503));
  });

  function expectWishlistCookieUntouched() {
    expect(mockClearWishlistSession).not.toHaveBeenCalled();
    expect(mockSetWishlistSession).not.toHaveBeenCalled();
    expect(mockRotateWishlistSessionAnonymousId).not.toHaveBeenCalled();
  }

  it('loginCustomer succeeds when the guest wishlist read fails with 503', async () => {
    await expect(loginCustomer('jane@example.com', 'Secret123!')).resolves.toMatchObject({
      id: 'cust-1',
    });

    expect(mockShoppingListGetExecute).toHaveBeenCalledTimes(1);
    expect(mockSetCustomerSession).toHaveBeenCalledTimes(1);
    expectWishlistCookieUntouched();
  });

  it('registerCustomer succeeds when the guest wishlist read fails with 503', async () => {
    await expect(
      registerCustomer({
        email: 'jane@example.com',
        password: 'Secret123!',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).resolves.toMatchObject({ id: 'cust-1' });

    expect(mockShoppingListGetExecute).toHaveBeenCalledTimes(1);
    expect(mockSetCustomerSession).toHaveBeenCalledTimes(1);
    expectWishlistCookieUntouched();
  });
});
