import Image from 'next/image';
import Link from 'next/link';

import { formatPrice } from '@/lib/format';
import type { StorefrontProduct } from '@/lib/commercetools/products';

type ProductCardCompactProps = {
  product: StorefrontProduct;
};

export function ProductCardCompact({ product }: ProductCardCompactProps) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs/5 transition-colors hover:bg-accent/30"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
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
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.price
            ? formatPrice(product.price.centAmount, product.price.currencyCode)
            : 'Price unavailable'}
        </p>
      </div>
    </Link>
  );
}
