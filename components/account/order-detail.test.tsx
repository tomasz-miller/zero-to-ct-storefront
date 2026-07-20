import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CartProvider } from '@/components/cart/cart-context';
import type { StorefrontOrderDetail } from '@/lib/commercetools/customer-mappers';

import { OrderDetail } from './order-detail';

const order: StorefrontOrderDetail = {
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
  payments: [
    {
      id: 'payment-1',
      method: 'card',
      paymentInterface: 'checkout-stripe',
      providerLabel: 'Card via Stripe',
      amountPlanned: {
        centAmount: 12345,
        currencyCode: 'EUR',
        formatted: '€123.45',
      },
      transactions: [
        {
          id: 'charge-1',
          type: 'Charge',
          state: 'Success',
          amount: {
            centAmount: 12345,
            currencyCode: 'EUR',
            formatted: '€123.45',
          },
          timestamp: '2026-02-01T12:00:02.000Z',
        },
      ],
    },
  ],
  lineItems: [],
};

describe('OrderDetail', () => {
  it('renders payment status and a customer-friendly provider label', () => {
    render(
      <CartProvider>
        <OrderDetail order={order} />
      </CartProvider>,
    );

    expect(screen.getByText('Payment status')).toBeInTheDocument();
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(screen.getByText('Card via Stripe')).toBeInTheDocument();
    expect(screen.queryByText('checkout-stripe')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Order again' }),
    ).toBeInTheDocument();
  });
});
