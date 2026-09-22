'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field';
import { Spinner } from '@/components/ui/spinner';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';
import { cn } from '@/lib/utils';

const QUANTITY_CEILING = 99;

type AddToCartButtonProps = {
  sku: string;
  disabled?: boolean;
  outOfStock?: boolean;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  fullWidthOnMobile?: boolean;
  /** Render a quantity stepper so a shopper can add several units at once. */
  showQuantity?: boolean;
  /** Known stock ceiling; falls back to {@link QUANTITY_CEILING}. */
  maxQuantity?: number;
  onAdded?: () => void;
};

export function AddToCartButton({
  sku,
  disabled,
  outOfStock = false,
  size = 'default',
  className,
  fullWidthOnMobile = false,
  showQuantity = false,
  maxQuantity,
  onAdded,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { syncCartItemCount } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const isDisabled = disabled || outOfStock || isLoading || !sku;
  const max =
    typeof maxQuantity === 'number' && maxQuantity > 0
      ? Math.min(maxQuantity, QUANTITY_CEILING)
      : QUANTITY_CEILING;

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, quantity: showQuantity ? quantity : 1 }),
      });

      const body = (await response.json().catch(() => null)) as {
        cart?: StorefrontCart;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to add to cart');
      }

      syncCartItemCount(body?.cart?.itemCount ?? 0);
      onAdded?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex gap-2',
          fullWidthOnMobile
            ? 'flex-col sm:flex-row sm:items-center'
            : 'items-center',
        )}
      >
        {showQuantity ? (
          <NumberField
            value={quantity}
            onValueChange={(value) => setQuantity(value ?? 1)}
            min={1}
            max={max}
            disabled={isDisabled}
            size="sm"
            className="w-auto"
          >
            <NumberFieldGroup className="w-28">
              <NumberFieldDecrement aria-label="Decrease quantity" />
              <NumberFieldInput aria-label="Quantity" />
              <NumberFieldIncrement aria-label="Increase quantity" />
            </NumberFieldGroup>
          </NumberField>
        ) : null}
        <Button
          size={size}
          disabled={isDisabled}
          onClick={handleClick}
          className={fullWidthOnMobile ? 'w-full sm:w-auto' : undefined}
        >
          {isLoading ? (
            <>
              <Spinner className="size-4" />
              Adding…
            </>
          ) : outOfStock ? (
            'Out of stock'
          ) : (
            'Add to cart'
          )}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
