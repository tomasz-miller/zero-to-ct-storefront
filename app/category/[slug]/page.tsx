import { notFound } from 'next/navigation';

import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { getCategoryBySlug } from '@/lib/commercetools/categories';
import { listProducts } from '@/lib/commercetools/products';

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const { products, total } = await listProducts({
    categoryId: category.id,
    limit: 24,
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">{category.name}</h1>
        <p className="text-sm text-muted-foreground">
          {total} product{total === 1 ? '' : 's'} in this category.
        </p>
      </div>
      <ProductGridCompact products={products} />
    </main>
  );
}
