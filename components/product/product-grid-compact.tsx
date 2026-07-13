import { ProductCardCompact } from '@/components/product/product-card-compact';
import type { StorefrontProduct } from '@/lib/commercetools/products';

type ProductGridCompactProps = {
  products: StorefrontProduct[];
};

export function ProductGridCompact({ products }: ProductGridCompactProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No products found.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {products.map((product) => (
        <ProductCardCompact key={product.id} product={product} />
      ))}
    </div>
  );
}
