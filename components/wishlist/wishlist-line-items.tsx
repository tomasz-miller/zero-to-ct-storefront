'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { useWishlist } from '@/components/wishlist/wishlist-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { StorefrontWishlist } from '@/lib/commercetools/wishlist-mappers';

type WishlistLineItemsProps = {
  wishlist: StorefrontWishlist;
};

export function WishlistLineItems({ wishlist }: WishlistLineItemsProps) {
  const router = useRouter();
  const { syncCartItemCount } = useCart();
  const { syncWishlist } = useWishlist();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeItem(lineItemId: string) {
    setPendingId(lineItemId);
    setError(null);

    try {
      const response = await fetch(`/api/wishlist/items/${lineItemId}`, {
        method: 'DELETE',
      });

      const body = (await response.json().catch(() => null)) as {
        wishlist?: StorefrontWishlist;
      } | null;

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      syncWishlist(
        body?.wishlist?.itemCount ?? 0,
        body?.wishlist?.skus ?? [],
      );
      router.refresh();
    } catch {
      setError('Could not remove item.');
    } finally {
      setPendingId(null);
    }
  }

  async function moveToCart(lineItemId: string) {
    setPendingId(lineItemId);
    setError(null);

    try {
      const response = await fetch(
        `/api/wishlist/items/${lineItemId}/move-to-cart`,
        { method: 'POST' },
      );

      const body = (await response.json().catch(() => null)) as {
        wishlist?: StorefrontWishlist;
        cartItemCount?: number;
      } | null;

      if (!response.ok) {
        throw new Error('Failed to move item to cart');
      }

      syncWishlist(
        body?.wishlist?.itemCount ?? 0,
        body?.wishlist?.skus ?? [],
      );
      syncCartItemCount(body?.cartItemCount ?? 0);
      router.refresh();
    } catch {
      setError('Could not move item to cart.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="flex flex-col gap-3">
        {wishlist.lineItems.map((item) => {
          const isPending = pendingId === item.id;

          return (
            <li key={item.id} className="flex gap-4 rounded-xl border p-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.slug ? (
                      <Link
                        href={`/product/${item.slug}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.name}</p>
                    )}
                    {item.sku ? (
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => moveToCart(item.id)}
                  >
                    {isPending ? <Spinner className="size-4" /> : 'Move to cart'}
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
    </div>
  );
}
