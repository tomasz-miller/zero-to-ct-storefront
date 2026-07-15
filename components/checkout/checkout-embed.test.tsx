import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockCheckoutFlow,
  mockClose,
  mockRefreshCart,
  mockRouter,
  mockSearchParams,
  mockSyncCartItemCount,
} = vi.hoisted(() => ({
  mockCheckoutFlow: vi.fn(),
  mockClose: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockRouter: { push: vi.fn() },
  mockSearchParams: new URLSearchParams(),
  mockSyncCartItemCount: vi.fn(),
}));

vi.mock('@commercetools/checkout-browser-sdk', () => ({
  checkoutFlow: mockCheckoutFlow,
  close: mockClose,
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
    mockClose.mockReset();
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

  it('passes storefront theme styles to checkoutFlow', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'session-1' }),
      }),
    );

    render(<CheckoutEmbed projectKey="project" region="eu" locale="en-GB" />);

    await waitFor(() => expect(mockCheckoutFlow).toHaveBeenCalledOnce());

    expect(mockCheckoutFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        styles: expect.objectContaining({
          '--font-family': expect.any(String),
          '--button': expect.any(String),
          '--button-text': expect.any(String),
        }),
      }),
    );
  });

  it('applies the default address and restarts checkout', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'session-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cart: { id: 'cart-1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'session-2' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <CheckoutEmbed
        projectKey="project"
        region="eu"
        locale="en-GB"
        canUseDefaultAddress
      />,
    );

    await waitFor(() => expect(mockCheckoutFlow).toHaveBeenCalledOnce());

    await user.click(
      screen.getByRole('button', { name: 'Use my default address' }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/checkout/default-address', {
        method: 'POST',
      });
      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockCheckoutFlow).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.getByText('Default address applied.'),
    ).toBeInTheDocument();
  });

  it('does not render the default address button for guests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'session-1' }),
      }),
    );

    render(<CheckoutEmbed projectKey="project" region="eu" locale="en-GB" />);

    await waitFor(() => expect(mockCheckoutFlow).toHaveBeenCalledOnce());

    expect(
      screen.queryByRole('button', { name: 'Use my default address' }),
    ).not.toBeInTheDocument();
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
