'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';

import { useWishlist } from '@/components/wishlist/wishlist-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type WishlistButtonProps = {
  sku: string;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon-sm';
  className?: string;
  showLabel?: boolean;
};

export function WishlistButton({
  sku,
  disabled,
  size = 'icon-sm',
  className,
  showLabel = false,
}: WishlistButtonProps) {
  const { isInWishlist, syncWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = isInWishlist(sku);

  async function handleClick() {
    if (!sku || saved) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wishlist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });

      const body = (await response.json().catch(() => null)) as {
        wishlist?: { itemCount: number; skus: string[] };
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to save to wishlist');
      }

      syncWishlist(body?.wishlist?.itemCount ?? 0, body?.wishlist?.skus ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to wishlist');
    } finally {
      setIsLoading(false);
    }
  }

  const label = saved ? 'Saved to wishlist' : 'Save to wishlist';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Button
        type="button"
        variant={saved ? 'secondary' : 'outline'}
        size={size}
        disabled={disabled || isLoading || !sku || saved}
        aria-label={label}
        aria-pressed={saved}
        onClick={handleClick}
      >
        {isLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Heart
            className={cn('size-4', saved ? 'fill-current text-primary' : 'opacity-80')}
            aria-hidden
          />
        )}
        {showLabel ? <span>{saved ? 'Saved' : 'Wishlist'}</span> : null}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
