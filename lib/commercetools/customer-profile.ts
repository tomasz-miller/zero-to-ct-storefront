import 'server-only';

import type { Address, Customer, MyCustomerUpdateAction } from '@commercetools/platform-sdk';
import { randomUUID } from 'node:crypto';

import { clearCartSession } from './cart-session';
import { getValidCustomerAccessToken } from './customer-auth';
import { clearCustomerSession } from './customer-session';
import { parseCtError } from './ct-errors';
import { createCustomerApiRoot } from './customer-client';
import { mapCustomerCtError, signInRequired } from './customer-errors';
import {
  mapCustomer,
  type StorefrontCustomer,
  type StorefrontCustomerAddress,
} from './customer-mappers';
import { CustomerError } from './domain-errors';
import type {
  ProfileUpdateInput,
  ValidatedAddressInput,
} from './customer-profile-validation';

async function requireCustomerAccessToken(): Promise<string> {
  const accessToken = await getValidCustomerAccessToken();
  if (!accessToken) {
    throw signInRequired();
  }
  return accessToken;
}

async function fetchMyCustomer(accessToken: string): Promise<Customer> {
  try {
    const response = await createCustomerApiRoot(accessToken).me().get().execute();
    return response.body;
  } catch (error) {
    throw (
      mapCustomerCtError(error) ??
      (parseCtError(error).statusCode === 401 ? signInRequired() : error)
    );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailsMatch(left: string, right: string): boolean {
  return normalizeEmail(left) === normalizeEmail(right);
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
): MyCustomerUpdateAction[] {
  const actions: MyCustomerUpdateAction[] = [];

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
  actions: MyCustomerUpdateAction[],
): Promise<StorefrontCustomer> {
  if (actions.length === 0) {
    const customer = await fetchMyCustomer(accessToken);
    return mapCustomer(customer);
  }

  try {
    const response = await createCustomerApiRoot(accessToken)
      .me()
      .post({ body: { version, actions } })
      .execute();
    return mapCustomer(response.body);
  } catch (error) {
    throw (
      mapCustomerCtError(error) ??
      (parseCtError(error).statusCode === 401 ? signInRequired() : error)
    );
  }
}

export async function updateCustomerProfile(
  input: ProfileUpdateInput,
): Promise<StorefrontCustomer> {
  const accessToken = await requireCustomerAccessToken();
  const customer = await fetchMyCustomer(accessToken);
  const actions: MyCustomerUpdateAction[] = [];

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

  const actions: MyCustomerUpdateAction[] = [
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
    throw new CustomerError('NotFound', 'Address not found', 404);
  }

  const actions: MyCustomerUpdateAction[] = [
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
    throw new CustomerError('NotFound', 'Address not found', 404);
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

  try {
    await createCustomerApiRoot(accessToken)
      .me()
      .password()
      .post({
        body: { version: customer.version, currentPassword, newPassword },
      })
      .execute();
  } catch (error) {
    throw (
      mapCustomerCtError(error) ??
      (parseCtError(error).statusCode === 401 ? signInRequired() : error)
    );
  }

  await clearCustomerSession();
  await clearCartSession();
}

export type { StorefrontCustomer, StorefrontCustomerAddress };
