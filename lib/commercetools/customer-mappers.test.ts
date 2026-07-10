import { describe, expect, it } from 'vitest';

import type { Customer, Order } from '@commercetools/platform-sdk';

import { mapCustomer, mapOrder, mapOrders } from './customer-mappers';

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
    addresses: [],
    shippingAddressIds: [],
    billingAddressIds: [],
    customerGroupAssignments: [],
    stores: [],
    isEmailVerified: false,
    authenticationMode: 'Password',
    ...overrides,
  };
}

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: '10001',
    createdAt: '2026-02-01T12:00:00.000Z',
    orderState: 'Open',
    paymentState: 'Paid',
    version: 1,
    lastModifiedAt: '2026-02-01T12:00:00.000Z',
    totalPrice: {
      centAmount: 12345,
      currencyCode: 'EUR',
      type: 'centPrecision',
      fractionDigits: 2,
    },
    lineItems: [],
    customLineItems: [],
    origin: 'Customer',
    shippingMode: 'Single',
    shipping: [],
    refusedGifts: [],
    syncInfo: [],
    ...overrides,
  };
}

describe('mapCustomer', () => {
  it('maps customer fields and display name from first and last name', () => {
    expect(mapCustomer(createCustomer())).toEqual({
      id: 'cust-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
    });
  });

  it('falls back to email for display name', () => {
    expect(
      mapCustomer(
        createCustomer({
          firstName: undefined,
          lastName: undefined,
          email: 'solo@example.com',
        }),
      ).displayName,
    ).toBe('solo@example.com');
  });
});

describe('mapOrder', () => {
  it('maps order summary fields', () => {
    expect(mapOrder(createOrder())).toEqual({
      id: 'order-1',
      orderNumber: '10001',
      createdAt: '2026-02-01T12:00:00.000Z',
      orderState: 'Open',
      paymentState: 'Paid',
      total: {
        centAmount: 12345,
        currencyCode: 'EUR',
        formatted: '€123.45',
      },
    });
  });
});

describe('mapOrders', () => {
  it('maps a list of orders', () => {
    const orders = mapOrders([
      createOrder({ id: 'order-1', orderState: 'Complete' }),
    ]);

    expect(orders).toHaveLength(1);
    expect(orders[0]?.id).toBe('order-1');
  });
});
