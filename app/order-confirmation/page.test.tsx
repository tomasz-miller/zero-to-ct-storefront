import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockGetConfirmedOrderForSession, mockIsMockPaymentsEnabled } = vi.hoisted(() => ({
  mockGetConfirmedOrderForSession: vi.fn(),
  mockIsMockPaymentsEnabled: vi.fn(),
}));

vi.mock('@/lib/commercetools/order-confirmation', () => ({
  getConfirmedOrderForSession: mockGetConfirmedOrderForSession,
}));

vi.mock('@/lib/commercetools/mock-payment', () => ({
  isMockPaymentsEnabled: mockIsMockPaymentsEnabled,
}));

import OrderConfirmationPage from './page';

describe('OrderConfirmationPage', () => {
  it('shows the order number and Checkout copy for a confirmed order', async () => {
    mockGetConfirmedOrderForSession.mockResolvedValueOnce({ orderNumber: 'ZT-20261113-0000ABCD' });
    mockIsMockPaymentsEnabled.mockReturnValueOnce(false);
    render(await OrderConfirmationPage());
    expect(screen.getByText('Thank you for your order')).toBeInTheDocument();
    expect(
      screen.getByText('Your payment was submitted through commercetools Checkout.'),
    ).toBeInTheDocument();
    expect(screen.getByText('ZT-20261113-0000ABCD')).toHaveClass('font-mono');
  });

  it('shows demo-payment copy when mock payments are enabled', async () => {
    mockGetConfirmedOrderForSession.mockResolvedValueOnce({ orderNumber: 'ZT-20261113-0000ABCD' });
    mockIsMockPaymentsEnabled.mockReturnValueOnce(true);
    render(await OrderConfirmationPage());
    expect(
      screen.getByText('Your demo payment was recorded. No real payment was taken.'),
    ).toBeInTheDocument();
  });

  it('shows a generic status without any order reference when nothing is confirmed', async () => {
    mockGetConfirmedOrderForSession.mockResolvedValueOnce(null);
    render(await OrderConfirmationPage());
    expect(screen.getByText('Order status')).toBeInTheDocument();
    expect(screen.queryByText(/Order number/)).toBeNull();
    expect(screen.getByRole('link', { name: 'View account' })).toHaveAttribute('href', '/account');
  });
});
