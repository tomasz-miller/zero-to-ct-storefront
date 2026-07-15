import 'server-only';

import type { Address, CartUpdateAction } from '@commercetools/platform-sdk';

import {
  CartAccessError,
  NoDefaultAddressError,
  updateActiveCart,
} from './cart';
import { getAuthenticatedCustomerProfile } from './customer-auth';
import type {
  StorefrontCustomer,
  StorefrontCustomerAddress,
} from './customer-mappers';

function storefrontAddressToCartAddress(
  address: StorefrontCustomerAddress,
): Address {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    streetName: address.streetName,
    streetNumber: address.streetNumber,
    postalCode: address.postalCode,
    city: address.city,
    country: address.country,
  };
}

export function customerCanUseDefaultAddress(
  customer: StorefrontCustomer | null,
): boolean {
  if (!customer) {
    return false;
  }

  return customer.addresses.some(
    (address) => address.isDefaultShipping || address.isDefaultBilling,
  );
}

export async function applyDefaultAddressesToCart() {
  const customer = await getAuthenticatedCustomerProfile();
  if (!customer) {
    throw new CartAccessError('Sign in required');
  }

  const defaultShippingAddress = customer.addresses.find(
    (address) => address.isDefaultShipping,
  );
  const defaultBillingAddress = customer.addresses.find(
    (address) => address.isDefaultBilling,
  );

  if (!defaultShippingAddress && !defaultBillingAddress) {
    throw new NoDefaultAddressError();
  }

  const actions: CartUpdateAction[] = [];

  if (defaultShippingAddress) {
    actions.push({
      action: 'setShippingAddress',
      address: storefrontAddressToCartAddress(defaultShippingAddress),
    });
  }

  if (defaultBillingAddress) {
    actions.push({
      action: 'setBillingAddress',
      address: storefrontAddressToCartAddress(defaultBillingAddress),
    });
  }

  actions.push({
    action: 'setCustomerEmail',
    email: customer.email,
  });

  return updateActiveCart(actions);
}
