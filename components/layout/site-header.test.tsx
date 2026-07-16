import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(() => '/'),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/layout/category-nav', () => ({
  CategoryNav: () => <div data-testid="category-nav" />,
}));

vi.mock('@/components/auth/account-nav', () => ({
  AccountNav: () => <div data-testid="account-nav" />,
}));

vi.mock('@/components/cart/cart-nav-link', () => ({
  CartNavLink: () => <div data-testid="cart-nav" />,
}));

vi.mock('@/components/wishlist/wishlist-nav-link', () => ({
  WishlistNavLink: () => <div data-testid="wishlist-nav" />,
}));

vi.mock('@/components/layout/store-brand', () => ({
  StoreBrand: () => <div data-testid="store-brand" />,
}));

vi.mock('@/components/layout/market-switcher', () => ({
  MarketSwitcher: () => <div data-testid="market-switcher" />,
}));

import { SiteHeader } from './site-header';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
    writable: true,
  });
}

describe('SiteHeader', () => {
  afterEach(() => {
    pathnameMock.mockReturnValue('/');
    setScrollY(0);
  });

  it('resets compact header state after navigation when scroll is at top', () => {
    setScrollY(100);

    const { rerender } = render(<SiteHeader country="DE" />);
    fireEvent.scroll(window);

    expect(document.querySelector('header')).toHaveStyle({ height: '46px' });

    setScrollY(0);
    pathnameMock.mockReturnValue('/search');
    rerender(<SiteHeader country="DE" />);

    expect(document.querySelector('header')).toHaveStyle({ height: '64px' });
  });

  it('uses page-aligned horizontal padding on the inner container', () => {
    render(<SiteHeader country="DE" />);

    const innerContainer = document.querySelector('header > div');
    expect(innerContainer).toHaveClass('px-6');
    expect(innerContainer).not.toHaveClass('px-4');
  });
});
