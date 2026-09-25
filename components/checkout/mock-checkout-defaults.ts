import type { StorefrontCustomer } from '@/lib/commercetools/customer-mappers';

export type MockCheckoutDefaults = {
  email: string;
  firstName: string;
  lastName: string;
  streetName: string;
  streetNumber: string;
  postalCode: string;
  city: string;
};

export function mockCheckoutDefaults(
  customer: StorefrontCustomer | null,
  country: string,
): MockCheckoutDefaults {
  const address =
    customer?.addresses.find((entry) => entry.isDefaultShipping) ??
    customer?.addresses.find((entry) => entry.isDefaultBilling);
  const sameCountry = address?.country === country ? address : undefined;

  return {
    email: customer?.email ?? '',
    firstName: sameCountry?.firstName ?? customer?.firstName ?? '',
    lastName: sameCountry?.lastName ?? customer?.lastName ?? '',
    streetName: sameCountry?.streetName ?? '',
    streetNumber: sameCountry?.streetNumber ?? '',
    postalCode: sameCountry?.postalCode ?? '',
    city: sameCountry?.city ?? '',
  };
}
