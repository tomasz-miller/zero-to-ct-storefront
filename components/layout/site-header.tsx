'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CartNavLink } from '@/components/cart/cart-nav-link';
import { AccountNav } from '@/components/auth/account-nav';
import { CategoryNav } from '@/components/layout/category-nav';
import { StoreBrand } from '@/components/layout/store-brand';
import type { StorefrontCategory } from '@/lib/commercetools/categories';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HEADER_HEIGHT = 64;
const HEADER_HEIGHT_SCROLLED = 46;

type SiteHeaderProps = {
  categories?: StorefrontCategory[];
};

export function SiteHeader({ categories = [] }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const headerHeight = isScrolled ? HEADER_HEIGHT_SCROLLED : HEADER_HEIGHT;

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-[height,background-color,box-shadow] duration-300 ease-out',
          isScrolled
            ? 'border-border/80 bg-muted/90 shadow-sm backdrop-blur-md'
            : 'border-border/60 bg-background/95 backdrop-blur-sm',
        )}
        style={{ height: headerHeight }}
      >
        <div
          className={cn(
            'mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 transition-[padding] duration-300 ease-out sm:px-6',
            isScrolled ? 'py-2' : 'py-3',
          )}
        >
          <StoreBrand compact={isScrolled} />
          <nav
            aria-label="Store navigation"
            className="flex items-center gap-1.5 sm:gap-2"
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
