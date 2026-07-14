import 'server-only';

import type { Address, Customer, CustomerUpdateAction } from '@commercetools/platform-sdk';
import { randomUUID } from 'node:crypto';

import { clearCartSession } from './cart-session';
import { apiRoot } from './api-root';
import {
  CustomerAuthError,
  getValidCustomerAccessToken,
} from './customer-auth';
import { clearCustomerSession } from './customer-session';
import {
  mapCustomer,
  type StorefrontCustomer,
  type StorefrontCustomerAddress,
} from './customer-mappers';
import { commercetoolsEnv } from './env';
import type {
  ProfileUpdateInput,
  ValidatedAddressInput,
} from './customer-profile-validation';
import { CustomerProfileError } from './customer-profile-error';

export { CustomerProfileError };

type CommercetoolsErrorBody = {
  statusCode?: number;
  errors?: Array<{ code?: string; message?: string; field?: string }>;
  message?: string;
};

function parseCommercetoolsError(raw: string): CommercetoolsErrorBody {
  try {
    return JSON.parse(raw) as CommercetoolsErrorBody;
  } catch {
    return { message: raw };
  }
}

function mapCommercetoolsError(
  status: number,
  body: CommercetoolsErrorBody,
): CustomerProfileError {
  const code = body.errors?.[0]?.code ?? 'UnknownError';
  const message = body.errors?.[0]?.message ?? body.message ?? 'Request failed';

  if (code === 'DuplicateField') {
    return new CustomerProfileError(
      code,
      'An account with this email already exists',
      409,
    );
  }
  if (code === 'ConcurrentModification') {
    return new CustomerProfileError(
      code,
      'Your profile was updated elsewhere. Refresh the page and try again.',
      409,
    );
  }
  if (code === 'InvalidCurrentPassword') {
    return new CustomerProfileError(code, 'Current password is incorrect', 400);
  }

  return new CustomerProfileError(code, message, status);
}

async function requireCustomerAccessToken(): Promise<string> {
  const accessToken = await getValidCustomerAccessToken();
  if (!accessToken) {
    throw new CustomerProfileError('Unauthorized', 'Sign in required', 401);
  }
  return accessToken;
}

async function fetchMyCustomer(accessToken: string): Promise<Customer> {
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

  return JSON.parse(raw) as Customer;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailsMatch(left: string, right: string): boolean {
  return normalizeEmail(left) === normalizeEmail(right);
}

export async function isCustomerEmailAvailable(
  email: string,
  excludeCustomerId: string,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const where = `lowercaseEmail="${normalizedEmail}" and id!="${excludeCustomerId}"`;

  const response = await apiRoot
    .customers()
    .get({
      queryArgs: {
        where,
        limit: 1,
      },
    })
    .execute();

  return response.body.results.length === 0;
}

function toAddressPayload(input: ValidatedAddressInput): Address {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    streetName: input.streetName,
    streetNumber: input.streetNumber,
    postalCode: input.postalCode,
    city: input.city,
    country: input.country,
  };
}

function buildDefaultAddressActions(
  addressId?: string,
  addressKey?: string,
  options?: { isDefaultShipping?: boolean; isDefaultBilling?: boolean },
): CustomerUpdateAction[] {
  const actions: CustomerUpdateAction[] = [];

  if (options?.isDefaultShipping) {
    actions.push({
      action: 'setDefaultShippingAddress',
      ...(addressId ? { addressId } : {}),
      ...(addressKey ? { addressKey } : {}),
    });
  }

  if (options?.isDefaultBilling) {
    actions.push({
      action: 'setDefaultBillingAddress',
      ...(addressId ? { addressId } : {}),
      ...(addressKey ? { addressKey } : {}),
    });
  }

  return actions;
}

async function postMyCustomerUpdate(
  accessToken: string,
  version: number,
  actions: CustomerUpdateAction[],
): Promise<StorefrontCustomer> {
  if (actions.length === 0) {
    const customer = await fetchMyCustomer(accessToken);
    return mapCustomer(customer);
  }

  const response = await fetch(
    `${commercetoolsEnv.apiUrl}/${commercetoolsEnv.projectKey}/me`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ version, actions }),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw mapCommercetoolsError(response.status, parseCommercetoolsError(raw));
  }

  return mapCustomer(JSON.parse(raw) as Customer);
}

export async function updateCustomerProfile(
  input: ProfileUpdateInput,
): Promise<StorefrontCustomer> {
  const accessToken = await requireCustomerAccessToken();
  const customer = await fetchMyCustomer(accessToken);
  const actions: CustomerUpdateAction[] = [];

  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const email = input.email?.trim();

  if (firstName && firstName !== customer.firstName) {
    actions.push({ action: 'setFirstName', firstName });
  }

  if (lastName && lastName !== customer.lastName) {
    actions.push({ action: 'setLastName', lastName });
  }

  if (email && !emailsMatch(email, customer.email)) {
    const available = await isCustomerEmailAvailable(email, customer.id);
    if (!available) {
      throw new CustomerProfileError(
        'DuplicateField',
        'An account with this email already exists',
        409,
      );
    }

    actions.push({ action: 'changeEmail', email });
  }

  return postMyCustomerUpdate(accessToken, customer.version, actions);
}

export async function addCustomerAddress(
  input: ValidatedAddressInput,
): Promise<StorefrontCustomer> {
  const accessToken = await requireCustomerAccessToken();
  const customer = await fetchMyCustomer(accessToken);
  const addressKey = `addr-${randomUUID()}`;

  const actions: CustomerUpdateAction[] = [
    {
      action: 'addAddress',
      address: {
        key: addressKey,
        ...toAddressPayload(input),
      },
    },
    ...buildDefaultAddressActions(undefined, addressKey, input),
  ];

  return postMyCustomerUpdate(accessToken, customer.version, actions);
}

export async function updateCustomerAddress(
  addressId: string,
  input: ValidatedAddressInput,
): Promise<StorefrontCustomer> {
  const accessToken = await requireCustomerAccessToken();
  const customer = await fetchMyCustomer(accessToken);

  const existing = customer.addresses.find((address) => address.id === addressId);
  if (!existing) {
    throw new CustomerProfileError('NotFound', 'Address not found', 404);
  }

  const actions: CustomerUpdateAction[] = [
    {
      action: 'changeAddress',
      addressId,
      address: {
        ...existing,
        ...toAddressPayload(input),
      },
    },
    ...buildDefaultAddressActions(addressId, undefined, input),
  ];

  return postMyCustomerUpdate(accessToken, customer.version, actions);
}

export async function removeCustomerAddress(
  addressId: string,
): Promise<StorefrontCustomer> {
  const accessToken = await requireCustomerAccessToken();
  const customer = await fetchMyCustomer(accessToken);

  const exists = customer.addresses.some((address) => address.id === addressId);
  if (!exists) {
    throw new CustomerProfileError('NotFound', 'Address not found', 404);
  }

  return postMyCustomerUpdate(accessToken, customer.version, [
    { action: 'removeAddress', addressId },
  ]);
}

export async function changeCustomerPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const accessToken = await requireCustomerAccessToken();
  const customer = await fetchMyCustomer(accessToken);

  const response = await fetch(
    `${commercetoolsEnv.apiUrl}/${commercetoolsEnv.projectKey}/me/password`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: customer.version,
        currentPassword,
        newPassword,
      }),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw mapCommercetoolsError(response.status, parseCommercetoolsError(raw));
  }

  await clearCustomerSession();
  await clearCartSession();
}

export function isCustomerProfileError(
  error: unknown,
): error is CustomerProfileError | CustomerAuthError {
  return (
    error instanceof CustomerProfileError || error instanceof CustomerAuthError
  );
}

export type { StorefrontCustomer, StorefrontCustomerAddress };
