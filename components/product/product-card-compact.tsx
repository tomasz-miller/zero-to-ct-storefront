import Image from 'next/image';
import Link from 'next/link';

import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { ProductPrice } from '@/components/product/product-price';
import type { StorefrontProduct } from '@/lib/commercetools/products';

type ProductCardCompactProps = {
  product: StorefrontProduct;
};

export function ProductCardCompact({ product }: ProductCardCompactProps) {
  return (
    <article className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs/5 transition-colors hover:bg-accent/30">
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <Link href={`/product/${product.slug}`} className="block size-full">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={200}
                height={200}
                className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                loading="eager"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </Link>
          <WishlistButton
            sku={product.sku ?? ''}
            disabled={!product.sku}
            className="absolute top-1 right-1 z-10"
          />
        </div>
        <Link
          href={`/product/${product.slug}`}
          className="flex min-h-0 flex-1 flex-col gap-0.5"
        >
          <p className="line-clamp-2 min-h-11 text-sm font-medium leading-snug">
            {product.name}
          </p>
          <p className="shrink-0 text-xs text-muted-foreground">
            <ProductPrice price={product.price} className="text-xs" />
          </p>
        </Link>
      </div>
      <AddToCartButton
        sku={product.sku ?? ''}
        disabled={!product.sku}
        size="sm"
        className="mt-auto w-full shrink-0"
      />
    </article>
  );
}
