'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';
import { cn } from '@/lib/utils';

type AddToCartButtonProps = {
  sku: string;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
};

export function AddToCartButton({
  sku,
  disabled,
  size = 'default',
  className,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { syncCartItemCount } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, quantity: 1 }),
      });

      const body = (await response.json().catch(() => null)) as {
        cart?: StorefrontCart;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to add to cart');
      }

      syncCartItemCount(body?.cart?.itemCount ?? 0);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button
        size={size}
        disabled={disabled || isLoading || !sku}
        onClick={handleClick}
      >
        {isLoading ? (
          <>
            <Spinner className="size-4" />
            Adding…
          </>
        ) : (
          'Add to cart'
        )}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
