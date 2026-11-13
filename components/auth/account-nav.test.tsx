import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { AccountNav } from './account-nav';

const { mockSignOut, mockRefreshCart, mockSyncWishlist } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockSyncWishlist: vi.fn(),
}));

vi.mock('@/components/auth/auth-context', () => ({
  useAuth: () => ({
    customer: { id: 'cust-1', email: 'jane@example.com', displayName: 'Jane' },
    isLoading: false,
    openLoginDialog: vi.fn(),
    signOut: mockSignOut,
  }),
}));
vi.mock('@/components/cart/cart-context', () => ({
  useCart: () => ({ refreshCart: mockRefreshCart }),
}));
vi.mock('@/components/wishlist/wishlist-context', () => ({
  useWishlist: () => ({ syncWishlist: mockSyncWishlist }),
}));

it('resets the wishlist and refreshes the cart after a successful sign-out', async () => {
  mockSignOut.mockResolvedValueOnce(true);
  render(<AccountNav />);
  await userEvent.click(screen.getByRole('button', { name: /jane/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
  await waitFor(() => expect(mockSyncWishlist).toHaveBeenCalledWith(0, []));
  expect(mockRefreshCart).toHaveBeenCalledTimes(1);
});

it('shows an alert and does not reset state when sign-out fails', async () => {
  mockSignOut.mockResolvedValueOnce(false);
  render(<AccountNav />);
  await userEvent.click(screen.getByRole('button', { name: /jane/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed. Try again.');
  expect(mockSyncWishlist).not.toHaveBeenCalled();
  expect(mockRefreshCart).not.toHaveBeenCalled();
});
