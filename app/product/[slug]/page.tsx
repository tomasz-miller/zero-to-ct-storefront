import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { ProductAvailability } from '@/components/product/product-availability';
import { ProductPrice } from '@/components/product/product-price';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getProductBySlug, isAvailabilityOutOfStock } from '@/lib/commercetools/products';

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
  const defaultSku =
    product.variants.find((variant) => variant.sku)?.sku ?? undefined;

  return (
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
                  loading="eager"
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
                      loading="eager"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription className="flex flex-col gap-2 text-base">
                <ProductPrice price={product.price} />
                {!hasMultipleVariants ? (
                  <ProductAvailability
                    availability={product.availability}
                    showInStock
                  />
                ) : null}
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
                        className="flex flex-col gap-3 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-col gap-1">
                          <span>{variant.name ?? `Variant ${variant.id}`}</span>
                          <span className="text-muted-foreground">
                            <ProductPrice price={variant.price} />
                          </span>
                          <ProductAvailability
                            availability={variant.availability}
                            showInStock
                          />
                        </div>
                        {variant.sku ? (
                          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <AddToCartButton
                              sku={variant.sku}
                              outOfStock={isAvailabilityOutOfStock(
                                variant.availability,
                              )}
                              fullWidthOnMobile
                            />
                            <WishlistButton sku={variant.sku} showLabel />
                          </div>
                        ) : (
                          <Button disabled size="sm">
                            Unavailable
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!hasMultipleVariants ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <AddToCartButton
                    sku={defaultSku ?? ''}
                    disabled={!defaultSku}
                    outOfStock={isAvailabilityOutOfStock(product.availability)}
                    fullWidthOnMobile
                  />
                  <WishlistButton
                    sku={defaultSku ?? ''}
                    disabled={!defaultSku}
                    showLabel
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
    </main>
  );
}
