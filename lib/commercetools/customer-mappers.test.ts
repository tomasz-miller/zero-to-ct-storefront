import { describe, expect, it } from 'vitest';

import type {
  Address,
  Customer,
  LineItem,
  Order,
  Payment,
} from '@commercetools/platform-sdk';

import {
  mapCustomer,
  mapOrder,
  mapOrderDetail,
  mapOrders,
} from './customer-mappers';

function createAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    streetName: 'Main Street',
    streetNumber: '42',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
    ...overrides,
  };
}

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

function createLineItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: 'line-1',
    productId: 'prod-1',
    productType: { typeId: 'product-type', id: 'pt-1' },
    name: { 'en-GB': 'Sample Jacket' },
    quantity: 2,
    variant: {
      id: 1,
      sku: 'JACKET-001',
      images: [
        { url: 'https://example.com/jacket.jpg', dimensions: { w: 1, h: 1 } },
      ],
    },
    price: {
      id: 'price-1',
      value: {
        centAmount: 5000,
        currencyCode: 'EUR',
        type: 'centPrecision',
        fractionDigits: 2,
      },
    },
    totalPrice: {
      centAmount: 10000,
      currencyCode: 'EUR',
      type: 'centPrecision',
      fractionDigits: 2,
    },
    taxedPricePortions: [],
    state: [],
    perMethodTaxRate: [],
    discountedPricePerQuantity: [],
    priceMode: 'Platform',
    lineItemMode: 'Standard',
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

function createPayment(): Payment {
  return {
    id: 'payment-1',
    version: 1,
    createdAt: '2026-02-01T12:00:00.000Z',
    lastModifiedAt: '2026-02-01T12:00:00.000Z',
    amountPlanned: {
      centAmount: 12345,
      currencyCode: 'EUR',
      type: 'centPrecision',
      fractionDigits: 2,
    },
    paymentMethodInfo: {
      paymentInterface: 'checkout-stripe',
      method: 'card',
    },
    paymentStatus: {},
    transactions: [
      {
        id: 'authorization-1',
        type: 'Authorization',
        state: 'Success',
        amount: {
          centAmount: 12345,
          currencyCode: 'EUR',
          type: 'centPrecision',
          fractionDigits: 2,
        },
      },
      {
        id: 'charge-1',
        type: 'Charge',
        state: 'Success',
        timestamp: '2026-02-01T12:00:02.000Z',
        amount: {
          centAmount: 12345,
          currencyCode: 'EUR',
          type: 'centPrecision',
          fractionDigits: 2,
        },
      },
    ],
    interfaceInteractions: [],
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
      createdAt: '2026-01-01T00:00:00.000Z',
      addresses: [],
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

  it('maps addresses with default billing and shipping flags', () => {
    const customer = createCustomer({
      addresses: [
        createAddress({ id: 'addr-ship' }),
        createAddress({
          id: 'addr-bill',
          streetName: 'Billing Road',
          streetNumber: '7',
        }),
      ],
      defaultShippingAddressId: 'addr-ship',
      defaultBillingAddressId: 'addr-bill',
    });

    const mapped = mapCustomer(customer);

    expect(mapped.addresses).toHaveLength(2);
    expect(mapped.addresses[0]).toMatchObject({
      id: 'addr-ship',
      streetName: 'Main Street',
      streetNumber: '42',
      street: 'Main Street 42',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
      formatted: 'Main Street 42, 10115 Berlin, DE',
      isDefaultShipping: true,
      isDefaultBilling: false,
    });
    expect(mapped.addresses[1]).toMatchObject({
      id: 'addr-bill',
      street: 'Billing Road 7',
      isDefaultShipping: false,
      isDefaultBilling: true,
    });
  });
});

describe('mapOrder', () => {
  it('maps order summary fields and falls back to paymentState', () => {
    expect(mapOrder(createOrder())).toEqual({
      id: 'order-1',
      orderNumber: '10001',
      createdAt: '2026-02-01T12:00:00.000Z',
      orderState: 'Open',
      paymentState: 'Paid',
      paymentStatus: 'Paid',
      total: {
        centAmount: 12345,
        currencyCode: 'EUR',
        formatted: '€123.45',
      },
    });
  });
});

describe('payment mapping', () => {
  it('derives the status and maps expanded payment transactions', () => {
    const order = createOrder({
      paymentInfo: {
        payments: [
          { typeId: 'payment', id: 'payment-1', obj: createPayment() },
        ],
      },
    });

    const detail = mapOrderDetail(order);

    expect(detail.paymentStatus).toBe('Paid');
    expect(detail.payments).toEqual([
      {
        id: 'payment-1',
        paymentInterface: 'checkout-stripe',
        providerLabel: 'Card via Stripe',
        method: 'card',
        amountPlanned: {
          centAmount: 12345,
          currencyCode: 'EUR',
          formatted: '€123.45',
        },
        transactions: [
          expect.objectContaining({
            id: 'authorization-1',
            type: 'Authorization',
            state: 'Success',
          }),
          expect.objectContaining({
            id: 'charge-1',
            type: 'Charge',
            state: 'Success',
            timestamp: '2026-02-01T12:00:02.000Z',
          }),
        ],
      },
    ]);
  });

  it('falls back to paymentState when payment references are not expanded', () => {
    const order = createOrder({
      paymentState: 'Paid',
      paymentInfo: {
        payments: [{ typeId: 'payment', id: 'payment-1' }],
      },
    });

    expect(mapOrder(order).paymentStatus).toBe('Paid');
    expect(mapOrderDetail(order).payments).toEqual([]);
  });

  it('uses the worst payment status when multiple payments conflict', () => {
    const failedPayment: Payment = {
      ...createPayment(),
      id: 'payment-2',
      transactions: [
        {
          id: 'authorization-2',
          type: 'Authorization',
          state: 'Failure',
          amount: {
            centAmount: 12345,
            currencyCode: 'EUR',
            type: 'centPrecision',
            fractionDigits: 2,
          },
        },
      ],
    };

    const order = createOrder({
      paymentInfo: {
        payments: [
          { typeId: 'payment', id: 'payment-1', obj: createPayment() },
          { typeId: 'payment', id: 'payment-2', obj: failedPayment },
        ],
      },
    });

    expect(mapOrder(order).paymentStatus).toBe('Failed');
  });
});

describe('mapOrderDetail', () => {
  it('maps line items, addresses, and shipping info', () => {
    const order = createOrder({
      lineItems: [createLineItem()],
      billingAddress: createAddress({
        streetName: 'Billing Street',
        streetNumber: '1',
      }),
      shippingAddress: createAddress({
        streetName: 'Shipping Street',
        streetNumber: '9',
      }),
      shippingInfo: {
        shippingMethodName: 'Standard Delivery',
        price: {
          centAmount: 500,
          currencyCode: 'EUR',
          type: 'centPrecision',
          fractionDigits: 2,
        },
        shippingRate: {
          price: {
            centAmount: 500,
            currencyCode: 'EUR',
            type: 'centPrecision',
            fractionDigits: 2,
          },
          freeAbove: {
            centAmount: 0,
            currencyCode: 'EUR',
            type: 'centPrecision',
            fractionDigits: 2,
          },
          tiers: [],
        },
        shippingMethodState: 'MatchesCart',
      },
    });

    const detail = mapOrderDetail(order);

    expect(detail.lineItems).toHaveLength(1);
    expect(detail.lineItems[0]).toMatchObject({
      id: 'line-1',
      name: 'Sample Jacket',
      sku: 'JACKET-001',
      quantity: 2,
      imageUrl: 'https://example.com/jacket.jpg',
      unitPrice: {
        centAmount: 5000,
        currencyCode: 'EUR',
        formatted: '€50.00',
      },
      totalPrice: {
        centAmount: 10000,
        currencyCode: 'EUR',
        formatted: '€100.00',
      },
    });
    expect(detail.billingAddress?.formatted).toBe(
      'Billing Street 1, 10115 Berlin, DE',
    );
    expect(detail.shippingAddress?.formatted).toBe(
      'Shipping Street 9, 10115 Berlin, DE',
    );
    expect(detail.shippingMethod).toBe('Standard Delivery');
    expect(detail.shippingCost).toEqual({
      centAmount: 500,
      currencyCode: 'EUR',
      formatted: '€5.00',
    });
  });

  it('handles missing optional order fields', () => {
    const detail = mapOrderDetail(createOrder());

    expect(detail.lineItems).toEqual([]);
    expect(detail.payments).toEqual([]);
    expect(detail.billingAddress).toBeUndefined();
    expect(detail.shippingAddress).toBeUndefined();
    expect(detail.shippingMethod).toBeUndefined();
    expect(detail.shippingCost).toBeUndefined();
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
