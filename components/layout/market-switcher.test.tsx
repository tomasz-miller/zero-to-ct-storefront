import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshCart, routerRefresh, syncCartItemCount } = vi.hoisted(() => ({
  refreshCart: vi.fn(),
  routerRefresh: vi.fn(),
  syncCartItemCount: vi.fn(),
}));

let mockItemCount: number | null = 0;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock('@/components/cart/cart-context', () => ({
  useCart: () => ({
    itemCount: mockItemCount,
    refreshCart,
    syncCartItemCount,
  }),
}));

vi.mock('@/components/account/dismissible-alert', () => ({
  DismissibleAlert: ({
    message,
    onDismiss,
  }: {
    message: string;
    onDismiss: () => void;
  }) => (
    <div role="alert">
      <span>{message}</span>
      <button type="button" onClick={onDismiss}>
        Dismiss alert
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ComponentProps<'button'>) => <button {...props} />,
}));

vi.mock('@/components/ui/menu', () => ({
  Menu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MenuPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MenuRadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MenuRadioItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  MenuTrigger: ({ render: trigger }: { render: React.ReactElement }) => trigger,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div role="alertdialog">{children}</div> : null),
  AlertDialogPopup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogClose: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { MarketSwitcher } from './market-switcher';

describe('MarketSwitcher', () => {
  beforeEach(() => {
    mockItemCount = 0;
    refreshCart.mockReset();
    routerRefresh.mockReset();
    syncCartItemCount.mockReset();
    refreshCart.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          country: 'GB',
          cartRecreated: false,
          cartRestored: false,
          itemCount: 0,
          previousHadItems: false,
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('changes the market through the BFF when the cart is empty', async () => {
    render(<MarketSwitcher country="DE" />);

    fireEvent.click(
      screen.getByRole('button', { name: /United Kingdom · GBP/i }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/storefront/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'GB' }),
      });
    });
    expect(refreshCart).toHaveBeenCalledOnce();
    expect(routerRefresh).toHaveBeenCalledOnce();
  });

  it('asks for confirmation before switching when the cart has items', async () => {
    mockItemCount = 2;
    render(<MarketSwitcher country="DE" />);

    fireEvent.click(
      screen.getByRole('button', { name: /United Kingdom · GBP/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Switch store?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your cart for Germany will be saved/i),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      '/api/storefront/market',
      expect.anything(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(
      screen.queryByRole('heading', { name: 'Switch store?' }),
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      '/api/storefront/market',
      expect.anything(),
    );
  });

  it('switches market after the user confirms saving the current cart', async () => {
    mockItemCount = 2;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          country: 'GB',
          cartRecreated: true,
          cartRestored: false,
          itemCount: 0,
          previousHadItems: true,
        }),
      }),
    );

    render(<MarketSwitcher country="DE" />);

    fireEvent.click(
      screen.getByRole('button', { name: /United Kingdom · GBP/i }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/storefront/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'GB' }),
      });
    });
    expect(
      await screen.findByText(/Started a new empty cart for this market/i),
    ).toBeInTheDocument();
    expect(syncCartItemCount).toHaveBeenCalledWith(0);
  });

  it('does not warn when a parked market cart is restored', async () => {
    mockItemCount = 2;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          country: 'GB',
          cartRecreated: false,
          cartRestored: true,
          itemCount: 3,
          previousHadItems: true,
        }),
      }),
    );

    render(<MarketSwitcher country="DE" />);

    fireEvent.click(
      screen.getByRole('button', { name: /United Kingdom · GBP/i }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(syncCartItemCount).toHaveBeenCalledWith(3);
    });
    expect(
      screen.queryByText(/Started a new empty cart for this market/i),
    ).not.toBeInTheDocument();
  });

  it('follows the server country prop after refresh', () => {
    const { rerender } = render(<MarketSwitcher country="DE" />);

    expect(
      screen.getByRole('button', {
        name: 'Change market, currently Germany',
      }),
    ).toBeInTheDocument();

    rerender(<MarketSwitcher country="GB" />);

    expect(
      screen.getByRole('button', {
        name: 'Change market, currently United Kingdom',
      }),
    ).toBeInTheDocument();
  });
});
