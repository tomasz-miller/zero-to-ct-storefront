import { ProductGridCompact } from '@/components/product/product-grid-compact';
import {
  listBestSellingProducts,
  listNewArrivalProducts,
} from '@/lib/commercetools/products';

export default async function HomePage() {
  const [bestSellers, newArrivals] = await Promise.all([
    listBestSellingProducts({ limit: 12 }),
    listNewArrivalProducts({ limit: 12 }),
  ]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10">
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium">Best Sellers</h1>
          <p className="text-sm text-muted-foreground">
            Established catalog favorites from your commercetools demo project (
            {bestSellers.total} products).
          </p>
        </div>
        <ProductGridCompact products={bestSellers.products} />
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-medium">New Arrivals</h2>
          <p className="text-sm text-muted-foreground">
            Recently added products from the new-arrivals category (
            {newArrivals.total} products).
          </p>
        </div>
        <ProductGridCompact products={newArrivals.products} />
      </section>
    </main>
  );
}
