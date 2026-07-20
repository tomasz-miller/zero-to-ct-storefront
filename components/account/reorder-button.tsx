'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';
import { cn } from '@/lib/utils';

type ReorderButtonProps = {
  orderId: string;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  variant?: 'default' | 'outline';
};

export function ReorderButton({
  orderId,
  size = 'default',
  className,
  variant = 'default',
}: ReorderButtonProps) {
  const router = useRouter();
  const { syncCartItemCount } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const body = (await response.json().catch(() => null)) as {
        cart?: StorefrontCart;
        added?: number;
        skipped?: number;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to reorder');
      }

      syncCartItemCount(body?.cart?.itemCount ?? 0);

      const added = body?.added ?? 0;
      const skipped = body?.skipped ?? 0;
      const cartUrl =
        skipped > 0
          ? `/cart?reorderAdded=${added}&reorderSkipped=${skipped}`
          : '/cart';

      router.push(cartUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button
        size={size}
        variant={variant}
        disabled={isLoading || !orderId}
        onClick={handleClick}
      >
        {isLoading ? (
          <>
            <Spinner className="size-4" />
            Adding…
          </>
        ) : (
          'Order again'
        )}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
