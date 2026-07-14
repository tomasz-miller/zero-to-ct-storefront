'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { CartLineItems } from '@/components/cart/cart-line-items';
import { CartTriggerButton } from '@/components/cart/cart-trigger-button';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';

type CartDrawerProps = {
  compact?: boolean;
};

export function CartDrawer({ compact = false }: CartDrawerProps) {
  const { syncCartItemCount } = useCart();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<StorefrontCart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCart = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/cart');
      if (!response.ok) {
        setCart(null);
        syncCartItemCount(0);
        return;
      }

      const body = (await response.json()) as {
        cart: StorefrontCart | null;
      };

      setCart(body.cart);
      syncCartItemCount(body.cart?.itemCount ?? 0);
    } catch {
      setCart(null);
      syncCartItemCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [syncCartItemCount]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      void loadCart();
    }
  }

  function handleCartUpdated(updatedCart: StorefrontCart) {
    setCart(updatedCart);
    syncCartItemCount(updatedCart.itemCount);
  }

  function handleCheckoutClick() {
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<CartTriggerButton compact={compact} />} />
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Review items before checkout.</SheetDescription>
        </SheetHeader>
        <SheetPanel>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : !cart || cart.lineItems.length === 0 ? (
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Button
                render={<Link href="/search" onClick={() => setOpen(false)} />}
              >
                Browse products
              </Button>
            </div>
          ) : (
            <CartLineItems
              cart={cart}
              onCartUpdated={handleCartUpdated}
              onCheckoutClick={handleCheckoutClick}
            />
          )}
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
