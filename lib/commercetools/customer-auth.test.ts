/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('./env', () => ({
  commercetoolsEnv: {
    authUrl: 'https://auth.example.com',
    apiUrl: 'https://api.example.com',
    projectKey: 'demo-project',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  },
}));

import {
  CustomerAuthError,
  loginCustomer,
  registerCustomer,
  logoutCustomer,
  requestPasswordReset,
  resetCustomerPassword,
} from './customer-auth';

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

  it('clears customer and cart sessions on logout', async () => {
    await logoutCustomer();
    expect(mockClearCustomerSession).toHaveBeenCalled();
    expect(mockClearCartSession).toHaveBeenCalled();
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
