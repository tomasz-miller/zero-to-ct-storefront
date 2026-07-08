import Image from 'next/image';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardFrame,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatPrice } from '@/lib/format';
import type { StorefrontProduct } from '@/lib/commercetools/products';

type ProductCardProps = {
  product: StorefrontProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card>
      <CardFrame className="aspect-square overflow-hidden bg-muted">
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
      </CardFrame>
      <CardHeader>
        <CardTitle className="line-clamp-2 text-base">
          <Link href={`/product/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </CardTitle>
        <CardDescription>
          {product.price
            ? formatPrice(product.price.centAmount, product.price.currencyCode)
            : 'Price unavailable'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={`/product/${product.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View details
        </Link>
      </CardContent>
    </Card>
  );
}
