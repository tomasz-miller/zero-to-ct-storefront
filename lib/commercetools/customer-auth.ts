import 'server-only';

import type { Customer, CustomerSignInResult } from '@commercetools/platform-sdk';

import { apiRoot } from './api-root';
import { getOwnedGuestCartRef, reconcileCartOnAuth } from './cart';
import {
  clearCartSession,
  createAnonymousId,
  rotateCartSessionAnonymousId,
  setCartSession,
} from './cart-session';
import {
  clearCustomerSession,
  getCustomerSession,
  setCustomerSession,
  type CustomerSession,
} from './customer-session';
import { mapCustomer, type StorefrontCustomer } from './customer-mappers';
import {
  CUSTOMER_TOKEN_REFRESH_BUFFER_MS,
  CustomerAuthError,
  isCustomerSessionRejected,
  refreshCustomerSession,
  requestCustomerPasswordToken,
} from './customer-token';
import { commercetoolsEnv } from './env';
import {
  clearWishlistOnLogout,
  reconcileWishlistOnAuth,
} from './shopping-lists';

export { CustomerAuthError, refreshCustomerSession } from './customer-token';

type CommercetoolsErrorBody = {
  statusCode?: number;
  errors?: Array<{ code?: string; message?: string }>;
  message?: string;
};

function parseCommercetoolsError(raw: string): CommercetoolsErrorBody {
  try {
    return JSON.parse(raw) as CommercetoolsErrorBody;
  } catch {
    return { message: raw };
  }
}

function isConsumedAnonymousIdError(body: CommercetoolsErrorBody): boolean {
  const message = body.errors?.[0]?.message ?? body.message ?? '';
  return message.includes('already used for sign-in or sign-up');
}

function extractClientError(error: unknown): {
  statusCode: number;
  body?: CommercetoolsErrorBody;
} | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    typeof (error as { statusCode?: number }).statusCode === 'number'
  ) {
    const clientError = error as {
      statusCode: number;
      body?: CommercetoolsErrorBody;
    };
    return clientError;
  }
  return null;
}

function throwMappedClientError(error: unknown, fallbackMessage: string): never {
  const clientError = extractClientError(error);
  if (clientError) {
    throw mapCommercetoolsError(
      clientError.statusCode,
      clientError.body ?? { message: fallbackMessage },
    );
  }
  throw error;
}

function mapCommercetoolsError(
  status: number,
  body: CommercetoolsErrorBody,
): CustomerAuthError {
  const code = body.errors?.[0]?.code ?? 'UnknownError';
  const message = body.errors?.[0]?.message ?? body.message ?? 'Request failed';

  if (code === 'InvalidCredentials') {
    return new CustomerAuthError(code, 'Invalid email or password', 401);
  }
  if (code === 'DuplicateField') {
    return new CustomerAuthError(code, 'An account with this email already exists', 409);
  }
  if (code === 'InvalidToken' || code === 'ExpiredToken') {
    return new CustomerAuthError(code, 'Password reset link is invalid or expired', 400);
  }

  return new CustomerAuthError(code, message, status);
}

async function exchangePasswordForCustomerToken(
  email: string,
  password: string,
): Promise<CustomerSession> {
  const token = await requestCustomerPasswordToken(email, password);

  const customerId = await resolveCustomerIdFromAccessToken(token.accessToken);

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    customerId,
  };
}

async function resolveCustomerIdFromAccessToken(accessToken: string): Promise<string> {
  const response = await fetch(
    `${commercetoolsEnv.apiUrl}/${commercetoolsEnv.projectKey}/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw mapCommercetoolsError(response.status, parseCommercetoolsError(raw));
  }

  const customer = JSON.parse(raw) as Customer;
  return customer.id;
}

/**
 * Server Component path: cookies are read-only during render, so this never refreshes or writes.
 * Token refresh happens in the root proxy (and in getValidCustomerAccessToken for Route Handlers).
 */
export async function getCustomerAccessTokenForRender(): Promise<string | null> {
  const session = await getCustomerSession();
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }
  return session.accessToken;
}

/** Route Handler / Server Action path: cookies are writable, so refresh when near expiry. */
export async function getValidCustomerAccessToken(): Promise<string | null> {
  const session = await getCustomerSession();
  if (!session) {
    return null;
  }

  if (session.expiresAt > Date.now() + CUSTOMER_TOKEN_REFRESH_BUFFER_MS) {
    return session.accessToken;
  }

  try {
    const refreshed = await refreshCustomerSession(session);
    await setCustomerSession(refreshed);
    return refreshed.accessToken;
  } catch (error) {
    if (isCustomerSessionRejected(error)) {
      await clearCustomerSession();
      return null;
    }
    return session.expiresAt > Date.now() ? session.accessToken : null;
  }
}

async function syncCartAfterAuth(result: CustomerSignInResult): Promise<void> {
  const mergedCart = result.cart;
  if (mergedCart?.id) {
    // CT marks anonymousId as consumed after sign-in/sign-up — rotate for future guest sessions.
    await setCartSession({
      anonymousId: createAnonymousId(),
      cartId: mergedCart.id,
    });
    return;
  }

  await reconcileCartOnAuth(result.customer.id);
}

type CartMigrationRefs = {
  anonymousCart?: { typeId: 'cart'; id: string };
  anonymousId?: string;
};

async function loginWithCartMigration(
  email: string,
  password: string,
  cartRefs: CartMigrationRefs,
) {
  return apiRoot
    .login()
    .post({
      body: {
        email,
        password,
        ...(cartRefs.anonymousCart && cartRefs.anonymousId
          ? {
              anonymousCart: cartRefs.anonymousCart,
              anonymousId: cartRefs.anonymousId,
              anonymousCartSignInMode: 'MergeWithExistingCustomerCart' as const,
            }
          : {}),
      },
    })
    .execute();
}

async function registerWithCartMigration(
  input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  },
  cartRefs: CartMigrationRefs,
) {
  return apiRoot
    .customers()
    .post({
      body: {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(cartRefs.anonymousCart && cartRefs.anonymousId
          ? {
              anonymousCart: cartRefs.anonymousCart,
              anonymousId: cartRefs.anonymousId,
            }
          : {}),
      },
    })
    .execute();
}

async function withStaleAnonymousCartRetry<T>(
  operation: (cartRefs: CartMigrationRefs) => Promise<T>,
  fallbackMessage: string,
): Promise<T> {
  const ownedGuestCart = await getOwnedGuestCartRef();
  const cartRefs: CartMigrationRefs = ownedGuestCart
    ? {
        anonymousCart: { typeId: 'cart', id: ownedGuestCart.cartId },
        anonymousId: ownedGuestCart.anonymousId,
      }
    : {};

  try {
    return await operation(cartRefs);
  } catch (error) {
    const clientError = extractClientError(error);
    if (
      clientError?.body &&
      isConsumedAnonymousIdError(clientError.body) &&
      cartRefs.anonymousCart
    ) {
      await rotateCartSessionAnonymousId();
      try {
        return await operation({});
      } catch (retryError) {
        throwMappedClientError(retryError, fallbackMessage);
      }
    }

    throwMappedClientError(error, fallbackMessage);
  }
}

export async function loginCustomer(
  email: string,
  password: string,
): Promise<StorefrontCustomer> {
  const response = await withStaleAnonymousCartRetry(
    (cartRefs) => loginWithCartMigration(email, password, cartRefs),
    'Login failed',
  );

  await syncCartAfterAuth(response.body);
  await reconcileWishlistOnAuth(response.body.customer.id);

  const session = await exchangePasswordForCustomerToken(email, password);
  await setCustomerSession(session);

  return mapCustomer(response.body.customer);
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<StorefrontCustomer> {
  const response = await withStaleAnonymousCartRetry(
    (cartRefs) => registerWithCartMigration(input, cartRefs),
    'Registration failed',
  );

  const customer = response.body.customer;
  if (response.body.cart) {
    await syncCartAfterAuth({
      customer,
      cart: response.body.cart,
    });
  } else {
    await reconcileCartOnAuth(customer.id);
  }

  await reconcileWishlistOnAuth(customer.id);

  const session = await exchangePasswordForCustomerToken(input.email, input.password);
  await setCustomerSession(session);

  return mapCustomer(customer);
}

export async function logoutCustomer(): Promise<void> {
  await clearCustomerSession();
  // Customer cart belongs to the account — drop browser cart cookie so guest session starts fresh.
  await clearCartSession();
  await clearWishlistOnLogout();
}

export async function requestPasswordReset(email: string): Promise<{
  tokenValue?: string;
}> {
  const response = await apiRoot
    .customers()
    .passwordToken()
    .post({
      body: {
        email,
        ttlMinutes: 60,
      },
    })
    .execute()
    .catch((error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'body' in error &&
        typeof (error as { statusCode?: number }).statusCode === 'number'
      ) {
        const clientError = error as {
          statusCode: number;
          body?: CommercetoolsErrorBody;
        };
        throw mapCommercetoolsError(
          clientError.statusCode,
          clientError.body ?? { message: 'Password reset request failed' },
        );
      }
      throw error;
    });

  return { tokenValue: response.body.value };
}

export async function resetCustomerPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiRoot
    .customers()
    .passwordReset()
    .post({
      body: {
        tokenValue: token,
        newPassword,
      },
    })
    .execute()
    .catch((error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'body' in error &&
        typeof (error as { statusCode?: number }).statusCode === 'number'
      ) {
        const clientError = error as {
          statusCode: number;
          body?: CommercetoolsErrorBody;
        };
        throw mapCommercetoolsError(
          clientError.statusCode,
          clientError.body ?? { message: 'Password reset failed' },
        );
      }
      throw error;
    });
}

export async function getAuthenticatedCustomerProfile(): Promise<StorefrontCustomer | null> {
  const accessToken = await getCustomerAccessTokenForRender();
  if (!accessToken) {
    return null;
  }

  const response = await fetch(
    `${commercetoolsEnv.apiUrl}/${commercetoolsEnv.projectKey}/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    if (response.status === 401) {
      await clearCustomerSession();
      return null;
    }
    throw mapCommercetoolsError(response.status, parseCommercetoolsError(raw));
  }

  return mapCustomer(JSON.parse(raw) as Customer);
}
