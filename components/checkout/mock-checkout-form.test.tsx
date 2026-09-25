import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPush, mockRefresh, mockSyncCartItemCount } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockSyncCartItemCount: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock('@/components/cart/cart-context', () => ({
  useCart: () => ({
    syncCartItemCount: mockSyncCartItemCount,
  }),
}));

import { MockCheckoutForm } from './mock-checkout-form';

const defaults = {
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  streetName: 'Demo Street',
  streetNumber: '1',
  postalCode: '10115',
  city: 'Berlin',
};

describe('MockCheckoutForm', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockSyncCartItemCount.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ shippingMethods: [] }),
      }),
    );
  });

  it('shows prefilled address fields and the market country', () => {
    render(<MockCheckoutForm country="DE" defaults={defaults} />);

    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Street')).toHaveValue('Demo Street');
    expect(screen.getByLabelText('Country')).toHaveValue('DE');
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('pays after continue and redirects to the order', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          shippingMethods: [
            {
              id: 'ship-1',
              name: 'Standard delivery',
              price: { centAmount: 490, currencyCode: 'EUR' },
            },
          ],
          total: { centAmount: 1190, currencyCode: 'EUR' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: { centAmount: 1680, currencyCode: 'EUR' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orderId: 'order-1' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<MockCheckoutForm country="DE" defaults={defaults} />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const shipping = await screen.findByRole('combobox', { name: 'Shipping method' });
    expect(shipping).toHaveValue('');
    expect(screen.queryByText(/Amount due/)).not.toBeInTheDocument();

    await user.selectOptions(shipping, 'ship-1');
    expect(await screen.findByText(/Amount due.*16\.80/)).toBeVisible();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pay now' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(fetchMock).toHaveBeenLastCalledWith('/api/checkout/mock-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingMethodId: 'ship-1' }),
    });
    expect(mockSyncCartItemCount).toHaveBeenCalledWith(0);
    expect(mockPush).toHaveBeenCalledWith('/order-confirmation?orderId=order-1');
  });
});
