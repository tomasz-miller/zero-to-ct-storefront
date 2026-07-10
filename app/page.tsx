import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { listBestSellingProducts } from '@/lib/commercetools/products';

export default async function HomePage() {
  const { products, total } = await listBestSellingProducts({ limit: 12 });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Best Sellers</h1>
        <p className="text-sm text-muted-foreground">
          Established catalog favorites from your commercetools demo project (
          {total} products).
        </p>
      </div>
      <ProductGridCompact products={products} />
    </main>
  );
}
