import { describe, expect, it } from 'vitest';

import type { StorefrontCustomer } from '@/lib/commercetools/customer-mappers';

import { mockCheckoutDefaults } from './mock-checkout-defaults';

function customer(
  country: string,
): StorefrontCustomer {
  return {
    id: 'cust-1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: 'Ada Lovelace',
    createdAt: '2026-01-01T00:00:00.000Z',
    addresses: [
      {
        id: 'addr-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        streetName: 'Oxford Street',
        streetNumber: '10',
        street: 'Oxford Street 10',
        city: 'London',
        postalCode: 'W1',
        country,
        formatted: 'Oxford Street 10, W1 London, GB',
        isDefaultShipping: true,
        isDefaultBilling: false,
      },
    ],
  };
}

describe('mockCheckoutDefaults', () => {
  it('copies a default address in the active market', () => {
    expect(mockCheckoutDefaults(customer('DE'), 'DE').streetName).toBe(
      'Oxford Street',
    );
  });

  it('leaves the street empty when the saved address is in another country', () => {
    const defaults = mockCheckoutDefaults(customer('GB'), 'DE');

    expect(defaults.email).toBe('ada@example.com');
    expect(defaults.firstName).toBe('Ada');
    expect(defaults.streetName).toBe('');
    expect(defaults.city).toBe('');
  });
});
