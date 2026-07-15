'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

import { CartNavLink } from '@/components/cart/cart-nav-link';
import { AccountNav } from '@/components/auth/account-nav';
import { CategoryNav } from '@/components/layout/category-nav';
import { StoreBrand } from '@/components/layout/store-brand';
import { WishlistNavLink } from '@/components/wishlist/wishlist-nav-link';
import type { StorefrontCategory } from '@/lib/commercetools/categories';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HEADER_HEIGHT = 64;
const HEADER_HEIGHT_SCROLLED = 46;

function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true });
  return () => window.removeEventListener('scroll', onStoreChange);
}

function getScrollSnapshot() {
  return window.scrollY > 0;
}

function getScrollServerSnapshot() {
  return false;
}

type SiteHeaderProps = {
  categories?: StorefrontCategory[];
};

function useIsPageScrolled() {
  usePathname();
  return useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getScrollServerSnapshot,
  );
}

export function SiteHeader({ categories = [] }: SiteHeaderProps) {
  const isScrolled = useIsPageScrolled();

  const headerHeight = isScrolled ? HEADER_HEIGHT_SCROLLED : HEADER_HEIGHT;

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 overflow-hidden border-b transition-[height,background-color,box-shadow] duration-300 ease-out',
          isScrolled
            ? 'border-border/80 bg-muted/90 shadow-sm backdrop-blur-md'
            : 'border-border/60 bg-background/95 backdrop-blur-sm',
        )}
        style={{ height: headerHeight }}
      >
        <div
          className={cn(
            'mx-auto flex h-full max-w-6xl items-center justify-between gap-2 overflow-hidden px-6 transition-[padding] duration-300 ease-out sm:gap-4',
            isScrolled ? 'py-2' : 'py-3',
          )}
        >
          <StoreBrand
            compact={isScrolled}
            hideTextBelowSm
            className="min-w-0 shrink md:shrink-0"
          />
          <nav
            aria-label="Store navigation"
            className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2"
          >
            <CategoryNav categories={categories} compact={isScrolled} />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              render={<Link href="/search" />}
            >
              <Search className="size-4 shrink-0 opacity-80" aria-hidden />
              <span className={cn(isScrolled ? 'sr-only' : 'hidden sm:inline')}>
                Search
              </span>
            </Button>
            <AccountNav compact={isScrolled} />
            <WishlistNavLink compact={isScrolled} />
            <CartNavLink compact={isScrolled} />
          </nav>
        </div>
      </header>
      <div
        aria-hidden
        className="shrink-0 transition-[height] duration-300 ease-out"
        style={{ height: headerHeight }}
      />
    </>
  );
}
