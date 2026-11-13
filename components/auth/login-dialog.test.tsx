import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuth } from '@/components/auth/auth-context';
import { LoginDialog } from './login-dialog';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/components/auth/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/components/cart/cart-context', () => ({ useCart: () => ({ refreshCart: vi.fn() }) }));
vi.mock('@/components/wishlist/wishlist-context', () => ({ useWishlist: () => ({ refreshWishlist: vi.fn() }) }));

// Cast: the dialog reads only these fields, and later tracks add fields to AuthContextValue.
const authState = {
  customer: null,
  isLoading: false,
  authView: 'login',
  loginDialogOpen: true,
  refreshSession: vi.fn(),
  openLoginDialog: vi.fn(),
  closeLoginDialog: vi.fn(),
  setAuthView: vi.fn(),
  signOut: vi.fn(),
} as unknown as ReturnType<typeof useAuth>;

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue(authState);
});

it('hides "Forgot password?" unless reset delivery is enabled', () => {
  const { unmount } = render(<LoginDialog />);
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
  unmount();
  render(<LoginDialog passwordResetEnabled />);
  expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
});
