import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatPrice } from '@/lib/format';
import { getProductBySlug } from '@/lib/commercetools/products';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const hasMultipleVariants = product.variants.length > 1;

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={800}
                  height={800}
                  className="size-full object-cover"
                  priority
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            {product.images.length > 1 ? (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(0, 4).map((imageUrl) => (
                  <div
                    key={imageUrl}
                    className="aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    <Image
                      src={imageUrl}
                      alt=""
                      width={200}
                      height={200}
                      className="size-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription className="text-base">
                {product.price
                  ? formatPrice(
                      product.price.centAmount,
                      product.price.currencyCode,
                    )
                  : 'Price unavailable'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {product.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description available.
                </p>
              )}

              {hasMultipleVariants ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium">Variants</h2>
                  <ul className="flex flex-col gap-2">
                    {product.variants.map((variant) => (
                      <li
                        key={variant.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <span>{variant.name ?? `Variant ${variant.id}`}</span>
                        <span className="text-muted-foreground">
                          {variant.price
                            ? formatPrice(
                                variant.price.centAmount,
                                variant.price.currencyCode,
                              )
                            : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Button disabled>Add to cart</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
