/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockExecute,
  mockLoginPost,
  mockCustomersPost,
  mockPasswordTokenPost,
  mockPasswordResetPost,
  mockGetCartSession,
  mockSetCartSession,
  mockGetCustomerSession,
  mockSetCustomerSession,
  mockClearCustomerSession,
  mockClearCartSession,
  mockRestoreCustomerCartSession,
  mockReconcileCartOnAuth,
  mockRefreshCustomerSession,
} = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockLoginPost: vi.fn(() => ({ execute: mockExecute })),
  mockCustomersPost: vi.fn(() => ({ execute: mockExecute })),
  mockPasswordTokenPost: vi.fn(() => ({ execute: mockExecute })),
  mockPasswordResetPost: vi.fn(() => ({ execute: mockExecute })),
  mockGetCartSession: vi.fn(),
  mockSetCartSession: vi.fn(),
  mockGetCustomerSession: vi.fn(),
  mockSetCustomerSession: vi.fn(),
  mockClearCustomerSession: vi.fn(),
  mockClearCartSession: vi.fn(),
  mockRestoreCustomerCartSession: vi.fn(),
  mockReconcileCartOnAuth: vi.fn(),
  mockRefreshCustomerSession: vi.fn(),
}));

vi.mock('./customer-token', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./customer-token')>()),
  refreshCustomerSession: mockRefreshCustomerSession,
}));

vi.mock('./cart', () => ({
  reconcileCartOnAuth: mockReconcileCartOnAuth,
  restoreCustomerCartSession: mockRestoreCustomerCartSession,
}));

vi.mock('./api-root', () => ({
  apiRoot: {
    login: vi.fn(() => ({ post: mockLoginPost })),
    customers: vi.fn(() => ({
      post: mockCustomersPost,
      passwordToken: vi.fn(() => ({ post: mockPasswordTokenPost })),
      passwordReset: vi.fn(() => ({ post: mockPasswordResetPost })),
    })),
  },
}));

vi.mock('./cart-session', () => ({
  getCartSession: mockGetCartSession,
  setCartSession: mockSetCartSession,
  createAnonymousId: vi.fn(() => 'anon-rotated'),
  rotateCartSessionAnonymousId: vi.fn(),
  clearCartSession: mockClearCartSession,
}));

vi.mock('./customer-session', () => ({
  getCustomerSession: mockGetCustomerSession,
  setCustomerSession: mockSetCustomerSession,
  clearCustomerSession: mockClearCustomerSession,
}));

vi.mock('./shopping-lists', () => ({
  reconcileWishlistOnAuth: vi.fn(),
  clearWishlistOnLogout: vi.fn(),
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

import {
  CustomerAuthError,
  getAuthenticatedCustomerProfile,
  getCustomerAccessTokenForRender,
  getValidCustomerAccessToken,
  loginCustomer,
  registerCustomer,
  logoutCustomer,
  requestPasswordReset,
  resetCustomerPassword,
} from './customer-auth';
import { clearWishlistOnLogout, reconcileWishlistOnAuth } from './shopping-lists';

describe('customer-auth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockExecute.mockReset();
    mockGetCartSession.mockReset();
    mockSetCartSession.mockReset();
    mockGetCustomerSession.mockReset();
    mockSetCustomerSession.mockReset();
    mockClearCustomerSession.mockReset();
  });

  it('logs in, merges cart, and stores customer session tokens', async () => {
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-1',
      cartId: 'cart-guest',
    });

    mockExecute.mockResolvedValueOnce({
      body: {
        customer: {
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
        },
        cart: {
          id: 'cart-merged',
          anonymousId: 'anon-1',
        },
      },
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 'cust-1',
            email: 'jane@example.com',
          }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const customer = await loginCustomer('jane@example.com', 'password123');

    expect(customer.email).toBe('jane@example.com');
    expect(new URLSearchParams(fetchMock.mock.calls[0][1].body).get('scope')).toBe(
      'manage_my_profile:demo-project manage_my_orders:demo-project',
    );
    expect(mockLoginPost).toHaveBeenCalledWith({
      body: {
        email: 'jane@example.com',
        password: 'password123',
        anonymousCartId: 'cart-guest',
        anonymousCartSignInMode: 'MergeWithExistingCustomerCart',
      },
    });
    expect(mockSetCartSession).toHaveBeenCalledWith({
      anonymousId: 'anon-rotated',
      cartId: 'cart-merged',
    });
    expect(mockSetCustomerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        customerId: 'cust-1',
      }),
    );
    expect(reconcileWishlistOnAuth).toHaveBeenCalledWith('cust-1');
  });

  it('restores customer cart session on login when no guest cart merge occurred', async () => {
    mockGetCartSession.mockResolvedValue(null);

    mockExecute.mockResolvedValueOnce({
      body: {
        customer: {
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
        },
      },
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 'cust-1',
            email: 'jane@example.com',
          }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await loginCustomer('jane@example.com', 'password123');

    expect(mockReconcileCartOnAuth).toHaveBeenCalledWith('cust-1');
    expect(mockSetCartSession).not.toHaveBeenCalled();
  });

  it('maps invalid credentials to CustomerAuthError', async () => {
    mockGetCartSession.mockResolvedValue(null);
    mockExecute.mockRejectedValueOnce({
      statusCode: 401,
      body: {
        errors: [{ code: 'InvalidCredentials', message: 'Invalid credentials' }],
      },
    });

    await expect(loginCustomer('jane@example.com', 'wrong')).rejects.toEqual(
      expect.objectContaining<Partial<CustomerAuthError>>({
        code: 'InvalidCredentials',
        statusCode: 401,
        message: 'Invalid email or password',
      }),
    );
  });

  it('retries registration without anonymous cart when anonymousId was already consumed', async () => {
    mockGetCartSession.mockResolvedValue({
      anonymousId: 'anon-consumed',
      cartId: 'cart-guest',
    });

    mockExecute
      .mockRejectedValueOnce({
        statusCode: 400,
        body: {
          message:
            "The anonymousId 'anon-consumed' was already used for sign-in or sign-up.",
        },
      })
      .mockResolvedValueOnce({
        body: {
          customer: {
            id: 'cust-2',
            email: 'new@example.com',
            firstName: 'New',
            lastName: 'User',
            version: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            lastModifiedAt: '2026-01-01T00:00:00.000Z',
            addresses: [],
            isEmailVerified: false,
            authenticationMode: 'Password',
          },
        },
      });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 'cust-2',
            email: 'new@example.com',
          }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const customer = await registerCustomer({
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    });

    expect(customer.email).toBe('new@example.com');
    expect(mockCustomersPost).toHaveBeenNthCalledWith(1, {
      body: {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        anonymousCartId: 'cart-guest',
      },
    });
    expect(mockCustomersPost).toHaveBeenNthCalledWith(2, {
      body: {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      },
    });
  });

  it('clears customer, cart, and wishlist sessions on logout', async () => {
    await logoutCustomer();
    expect(mockClearCustomerSession).toHaveBeenCalled();
    expect(mockClearCartSession).toHaveBeenCalled();
    expect(clearWishlistOnLogout).toHaveBeenCalled();
  });

  it('returns password reset token value in dev flow helper', async () => {
    mockExecute.mockResolvedValueOnce({
      body: { value: 'reset-token-abc' },
    });

    await expect(requestPasswordReset('jane@example.com')).resolves.toEqual({
      tokenValue: 'reset-token-abc',
    });
  });

  it('resets customer password with token', async () => {
    mockExecute.mockResolvedValueOnce({ body: {} });

    await resetCustomerPassword('reset-token-abc', 'newpassword1');

    expect(mockPasswordResetPost).toHaveBeenCalledWith({
      body: {
        tokenValue: 'reset-token-abc',
        newPassword: 'newpassword1',
      },
    });
  });
});

describe('customer access tokens', () => {
  const session = { accessToken: 'a-old', refreshToken: 'r-old', customerId: 'cust-1' };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    mockGetCustomerSession.mockReset();
    mockRefreshCustomerSession.mockReset();
    mockSetCustomerSession.mockReset();
    mockClearCustomerSession.mockReset();
  });

  it('getCustomerAccessTokenForRender returns null for an expired session and never refreshes or writes', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ ...session, expiresAt: Date.now() - 1 });
    await expect(getCustomerAccessTokenForRender()).resolves.toBeNull();
    expect(mockRefreshCustomerSession).not.toHaveBeenCalled();
    expect(mockSetCustomerSession).not.toHaveBeenCalled();
    expect(mockClearCustomerSession).not.toHaveBeenCalled();
  });

  it('getCustomerAccessTokenForRender returns the stored token while it is valid', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({
      ...session,
      accessToken: 'a-valid',
      expiresAt: Date.now() + 10_000,
    });
    await expect(getCustomerAccessTokenForRender()).resolves.toBe('a-valid');
  });

  it('getValidCustomerAccessToken refreshes within 60 s of expiry and stores the new session', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ ...session, expiresAt: Date.now() + 30_000 });
    mockRefreshCustomerSession.mockResolvedValueOnce({
      ...session,
      accessToken: 'a-new',
      expiresAt: Date.now() + 172_800_000,
    });
    await expect(getValidCustomerAccessToken()).resolves.toBe('a-new');
    expect(mockSetCustomerSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'a-new', customerId: 'cust-1' }),
    );
  });

  it('getValidCustomerAccessToken clears the session when refresh fails with 400', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ ...session, expiresAt: Date.now() + 30_000 });
    mockRefreshCustomerSession.mockRejectedValueOnce(
      new CustomerAuthError('RefreshFailed', 'Session expired', 400),
    );
    await expect(getValidCustomerAccessToken()).resolves.toBeNull();
    expect(mockClearCustomerSession).toHaveBeenCalledTimes(1);
  });

  it('getValidCustomerAccessToken keeps a still-valid token when refresh fails with 503', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ ...session, expiresAt: Date.now() + 30_000 });
    mockRefreshCustomerSession.mockRejectedValueOnce(
      new CustomerAuthError('RefreshFailed', 'Session expired', 503),
    );
    await expect(getValidCustomerAccessToken()).resolves.toBe('a-old');
    expect(mockClearCustomerSession).not.toHaveBeenCalled();
  });

  it('getAuthenticatedCustomerProfile does not call /me, refresh or write when the token is expired', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ ...session, expiresAt: Date.now() - 1 });
    await expect(getAuthenticatedCustomerProfile()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockRefreshCustomerSession).not.toHaveBeenCalled();
    expect(mockSetCustomerSession).not.toHaveBeenCalled();
  });

  it('getAuthenticatedCustomerProfile clears the session on a 401 from /me and returns null', async () => {
    mockGetCustomerSession.mockResolvedValueOnce({ ...session, expiresAt: Date.now() + 10_000 });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    mockClearCustomerSession.mockResolvedValueOnce(false); // render: cookies are read-only
    await expect(getAuthenticatedCustomerProfile()).resolves.toBeNull();
    expect(mockClearCustomerSession).toHaveBeenCalledTimes(1);
  });
});
