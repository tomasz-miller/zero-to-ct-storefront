'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useEffect } from 'react';

import { useWishlist } from '@/components/wishlist/wishlist-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WishlistNavLink({ compact = false }: { compact?: boolean }) {
  const { itemCount, refreshWishlist } = useWishlist();

  useEffect(() => {
    if (itemCount !== null) {
      return;
    }

    void refreshWishlist();
  }, [itemCount, refreshWishlist]);

  const label =
    itemCount === null
      ? 'Wishlist'
      : itemCount > 0
        ? `Wishlist, ${itemCount} item${itemCount === 1 ? '' : 's'}`
        : 'Wishlist';

  const shortLabel =
    itemCount === null || itemCount === 0 ? 'Wishlist' : String(itemCount);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      render={<Link href="/wishlist" aria-label={label} />}
    >
      <Heart className="size-4 shrink-0 opacity-80" aria-hidden />
      <span className={cn(compact ? 'min-w-4 text-center' : 'hidden sm:inline')}>
        {compact ? shortLabel : label}
      </span>
      {!compact && itemCount !== null && itemCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground sm:hidden">
          {itemCount}
        </span>
      ) : null}
    </Button>
  );
}
