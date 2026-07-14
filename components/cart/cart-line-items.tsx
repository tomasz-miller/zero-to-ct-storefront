'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { CartDiscountForm } from '@/components/cart/cart-discount-form';
import { CartSummary } from '@/components/cart/cart-summary';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatPrice } from '@/lib/format';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';

type CartLineItemsProps = {
  cart: StorefrontCart;
};

export function CartLineItems({ cart }: CartLineItemsProps) {
  const router = useRouter();
  const { syncCartItemCount } = useCart();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateQuantity(lineItemId: string, quantity: number) {
    setPendingId(lineItemId);
    setError(null);

    try {
      const response = await fetch(`/api/cart/items/${lineItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      const body = (await response.json().catch(() => null)) as {
        cart?: StorefrontCart;
      } | null;

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      syncCartItemCount(body?.cart?.itemCount ?? 0);
      router.refresh();
    } catch {
      setError('Could not update item quantity.');
    } finally {
      setPendingId(null);
    }
  }

  async function removeItem(lineItemId: string) {
    setPendingId(lineItemId);
    setError(null);

    try {
      const response = await fetch(`/api/cart/items/${lineItemId}`, {
        method: 'DELETE',
      });

      const body = (await response.json().catch(() => null)) as {
        cart?: StorefrontCart;
      } | null;

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      syncCartItemCount(body?.cart?.itemCount ?? 0);
      router.refresh();
    } catch {
      setError('Could not remove item.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="flex flex-col gap-3">
        {cart.lineItems.map((item) => {
          const isPending = pendingId === item.id;

          return (
            <li
              key={item.id}
              className="flex gap-4 rounded-xl border p-4"
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.sku ? (
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    ) : null}
                  </div>
                  <div className="text-sm font-medium">
                    {item.originalUnitPrice ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span>
                          {formatPrice(
                            item.totalPrice.centAmount,
                            item.totalPrice.currencyCode,
                          )}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground line-through">
                          {formatPrice(
                            item.originalUnitPrice.centAmount * item.quantity,
                            item.originalUnitPrice.currencyCode,
                          )}
                        </span>
                      </div>
                    ) : (
                      formatPrice(
                        item.totalPrice.centAmount,
                        item.totalPrice.currencyCode,
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending || item.quantity <= 1}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="min-w-8 text-center text-sm">
                    {isPending ? <Spinner className="mx-auto size-4" /> : item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <CartDiscountForm cart={cart} />
      <CartSummary cart={cart} className="border-t pt-4" />
      <Button render={<Link href="/checkout" />}>Proceed to checkout</Button>
    </div>
  );
}
