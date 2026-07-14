import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockCheckoutFlow,
  mockRefreshCart,
  mockRouter,
  mockSearchParams,
  mockSyncCartItemCount,
} = vi.hoisted(() => ({
  mockCheckoutFlow: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockRouter: { push: vi.fn() },
  mockSearchParams: new URLSearchParams(),
  mockSyncCartItemCount: vi.fn(),
}));

vi.mock('@commercetools/checkout-browser-sdk', () => ({
  checkoutFlow: mockCheckoutFlow,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/cart/cart-context', () => ({
  useCart: () => ({
    refreshCart: mockRefreshCart,
    syncCartItemCount: mockSyncCartItemCount,
  }),
}));

import { CheckoutEmbed } from './checkout-embed';

function checkoutCompletedCallback(): (message: {
  code: string;
  payload: { order?: { id?: string } };
}) => void {
  const options = mockCheckoutFlow.mock.calls[0]?.[0] as {
    onInfo: (message: {
      code: string;
      payload: { order?: { id?: string } };
    }) => void;
  };

  return options.onInfo;
}

describe('CheckoutEmbed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    mockCheckoutFlow.mockReset();
    mockRouter.push.mockReset();
    mockRefreshCart.mockReset();
    mockSyncCartItemCount.mockReset();
  });

  it('clears the badge only after cart-session cleanup succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sessionId: 'session-1' }),
        })
        .mockResolvedValueOnce({ ok: true }),
    );

    render(<CheckoutEmbed projectKey="project" region="eu" locale="en-GB" />);

    await waitFor(() => expect(mockCheckoutFlow).toHaveBeenCalledOnce());

    checkoutCompletedCallback()({
      code: 'checkout_completed',
      payload: { order: { id: 'order-1' } },
    });

    await waitFor(() => {
      expect(mockSyncCartItemCount).toHaveBeenCalledWith(0);
      expect(mockRouter.push).toHaveBeenCalledWith('/order-confirmation?orderId=order-1');
    });
    expect(mockRefreshCart).not.toHaveBeenCalled();
  });

  it('refreshes the badge instead of forcing zero when cleanup fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sessionId: 'session-1' }),
        })
        .mockResolvedValueOnce({ ok: false }),
    );

    render(<CheckoutEmbed projectKey="project" region="eu" locale="en-GB" />);

    await waitFor(() => expect(mockCheckoutFlow).toHaveBeenCalledOnce());

    checkoutCompletedCallback()({
      code: 'checkout_completed',
      payload: {},
    });

    await waitFor(() => {
      expect(mockRefreshCart).toHaveBeenCalledOnce();
      expect(mockRouter.push).toHaveBeenCalledWith('/order-confirmation');
    });
    expect(mockSyncCartItemCount).not.toHaveBeenCalled();
  });

  it('handles duplicate completion events once', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sessionId: 'session-1' }),
        })
        .mockResolvedValueOnce({ ok: true }),
    );

    render(<CheckoutEmbed projectKey="project" region="eu" locale="en-GB" />);

    await waitFor(() => expect(mockCheckoutFlow).toHaveBeenCalledOnce());

    const onInfo = checkoutCompletedCallback();
    const completionEvent = {
      code: 'checkout_completed',
      payload: { order: { id: 'order-1' } },
    };
    onInfo(completionEvent);
    onInfo(completionEvent);

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
