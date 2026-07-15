import { describe, expect, it, vi } from 'vitest';

import type { StorefrontCustomer } from './customer-mappers';

const { mockGetAuthenticatedCustomerProfile, mockUpdateActiveCart } = vi.hoisted(
  () => ({
    mockGetAuthenticatedCustomerProfile: vi.fn(),
    mockUpdateActiveCart: vi.fn(),
  }),
);

vi.mock('./customer-auth', () => ({
  getAuthenticatedCustomerProfile: mockGetAuthenticatedCustomerProfile,
}));

vi.mock('./cart', () => ({
  CartAccessError: class CartAccessError extends Error {},
  NoDefaultAddressError: class NoDefaultAddressError extends Error {
    constructor(message = 'No default address configured on your account') {
      super(message);
      this.name = 'NoDefaultAddressError';
    }
  },
  updateActiveCart: mockUpdateActiveCart,
}));

import {
  applyDefaultAddressesToCart,
  customerCanUseDefaultAddress,
} from './checkout-cart-addresses';

function createCustomer(
  overrides: Partial<StorefrontCustomer> = {},
): StorefrontCustomer {
  return {
    id: 'cust-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    createdAt: '2026-01-01T00:00:00.000Z',
    addresses: [],
    ...overrides,
  };
}

describe('customerCanUseDefaultAddress', () => {
  it('returns false for guests', () => {
    expect(customerCanUseDefaultAddress(null)).toBe(false);
  });

  it('returns true when a default shipping or billing address exists', () => {
    expect(
      customerCanUseDefaultAddress(
        createCustomer({
          addresses: [
            {
              id: 'addr-1',
              streetName: 'Main Street',
              streetNumber: '1',
              street: 'Main Street 1',
              city: 'Berlin',
              postalCode: '10115',
              country: 'DE',
              formatted: 'Main Street 1, 10115 Berlin, DE',
              isDefaultShipping: true,
              isDefaultBilling: false,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('applyDefaultAddressesToCart', () => {
  it('applies default shipping, billing, and customer email', async () => {
    mockGetAuthenticatedCustomerProfile.mockResolvedValue(
      createCustomer({
        addresses: [
          {
            id: 'addr-ship',
            firstName: 'Jane',
            lastName: 'Doe',
            streetName: 'Ship Street',
            streetNumber: '10',
            street: 'Ship Street 10',
            city: 'Berlin',
            postalCode: '10115',
            country: 'DE',
            formatted: 'Ship Street 10, 10115 Berlin, DE',
            isDefaultShipping: true,
            isDefaultBilling: false,
          },
          {
            id: 'addr-bill',
            firstName: 'Jane',
            lastName: 'Doe',
            streetName: 'Bill Street',
            streetNumber: '20',
            street: 'Bill Street 20',
            city: 'Hamburg',
            postalCode: '20095',
            country: 'DE',
            formatted: 'Bill Street 20, 20095 Hamburg, DE',
            isDefaultShipping: false,
            isDefaultBilling: true,
          },
        ],
      }),
    );
    mockUpdateActiveCart.mockResolvedValue({ id: 'cart-1' });

    await applyDefaultAddressesToCart();

    expect(mockUpdateActiveCart).toHaveBeenCalledWith([
      {
        action: 'setShippingAddress',
        address: {
          firstName: 'Jane',
          lastName: 'Doe',
          streetName: 'Ship Street',
          streetNumber: '10',
          postalCode: '10115',
          city: 'Berlin',
          country: 'DE',
        },
      },
      {
        action: 'setBillingAddress',
        address: {
          firstName: 'Jane',
          lastName: 'Doe',
          streetName: 'Bill Street',
          streetNumber: '20',
          postalCode: '20095',
          city: 'Hamburg',
          country: 'DE',
        },
      },
      {
        action: 'setCustomerEmail',
        email: 'jane@example.com',
      },
    ]);
  });

  it('throws when the customer has no default addresses', async () => {
    const { NoDefaultAddressError } = await import('./cart');
    mockGetAuthenticatedCustomerProfile.mockResolvedValue(createCustomer());

    await expect(applyDefaultAddressesToCart()).rejects.toBeInstanceOf(
      NoDefaultAddressError,
    );
  });
});
