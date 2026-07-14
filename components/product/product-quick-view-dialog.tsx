'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { ProductAvailability } from '@/components/product/product-availability';
import { ProductPrice } from '@/components/product/product-price';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { StorefrontProduct } from '@/lib/commercetools/products';
import { cn } from '@/lib/utils';

type ProductQuickViewDialogProps = {
  product: StorefrontProduct;
  className?: string;
};

export function ProductQuickViewDialog({
  product,
  className,
}: ProductQuickViewDialogProps) {
  const [open, setOpen] = useState(false);
  const outOfStock = !product.availability.isOnStock;
  const productHref = `/product/${product.slug}`;
  const canAddFromQuickView = !product.hasMultipleVariants;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`Quick view ${product.name}`}
        className={cn('z-10', className)}
        render={<Button size="sm" variant="secondary" />}
      >
        Quick view
      </DialogTrigger>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {canAddFromQuickView
              ? 'Preview this product and add it to your cart without leaving the listing.'
              : 'Preview this product. Choose a variant on the full product page before adding to cart.'}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  No image
                </div>
              )}
              <WishlistButton
                sku={product.sku ?? ''}
                disabled={!product.sku}
                className="absolute top-2 right-2"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ProductPrice price={product.price} />
              <ProductAvailability
                availability={product.availability}
                showInStock
              />
            </div>
            {canAddFromQuickView ? (
              <AddToCartButton
                sku={product.sku ?? ''}
                disabled={!product.sku}
                outOfStock={outOfStock}
                className="w-full"
                onAdded={() => setOpen(false)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing the default variant. Open the product page to choose size,
                color, or other options.
              </p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button render={<Link href={productHref} />} variant="outline">
            View full details
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
