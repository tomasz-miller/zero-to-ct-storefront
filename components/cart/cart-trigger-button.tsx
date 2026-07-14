'use client';

import type React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function useCartBadgeSync() {
  const { itemCount, syncCartItemCount } = useCart();

  useEffect(() => {
    if (itemCount !== null) {
      return;
    }

    let cancelled = false;

    async function loadCart() {
      try {
        const response = await fetch('/api/cart');
        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as {
          cart: { itemCount: number } | null;
        };

        if (!cancelled) {
          syncCartItemCount(body.cart?.itemCount ?? 0);
        }
      } catch {
        if (!cancelled) {
          syncCartItemCount(0);
        }
      }
    }

    void loadCart();

    return () => {
      cancelled = true;
    };
  }, [itemCount, syncCartItemCount]);

  return itemCount;
}

export function useCartLabels(itemCount: number | null) {
  const label =
    itemCount === null
      ? 'Cart'
      : itemCount > 0
        ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`
        : 'Cart';

  const shortLabel =
    itemCount === null || itemCount === 0 ? 'Cart' : String(itemCount);

  return { label, shortLabel };
}

type CartTriggerButtonProps = {
  compact?: boolean;
  className?: string;
  render?: React.ComponentProps<typeof Button>['render'];
};

export function CartTriggerButton({
  compact = false,
  className,
  render,
}: CartTriggerButtonProps) {
  const itemCount = useCartBadgeSync();
  const { label, shortLabel } = useCartLabels(itemCount);

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-1.5', className)}
      aria-label={label}
      render={render}
    >
      <ShoppingBag className="size-4 shrink-0 opacity-80" aria-hidden />
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
