import { ProductCard } from '@/components/product/product-card';
import type { StorefrontProduct } from '@/lib/commercetools/products';

type ProductGridProps = {
  products: StorefrontProduct[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No products found.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
