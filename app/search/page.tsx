import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { SearchForm } from '@/components/search/search-form';
import { listProducts } from '@/lib/commercetools/products';

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const hasQuery = query.length > 0;

  const { products, total } = hasQuery
    ? await listProducts({ query, limit: 24 })
    : { products: [], total: 0 };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium">Search</h1>
          <p className="text-sm text-muted-foreground">
            Find products in your commercetools catalog.
          </p>
        </div>
        <SearchForm defaultQuery={query} />
      </div>

      {hasQuery ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
          </p>
          <ProductGridCompact products={products} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enter a search term to browse products. Try &ldquo;bed&rdquo; or
          &ldquo;table&rdquo;.
        </p>
      )}
    </main>
  );
}
