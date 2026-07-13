import Link from 'next/link';

import { StoreBrand } from '@/components/layout/store-brand';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16">
      <StoreBrand />
      <div className="flex max-w-lg flex-col gap-3">
        <h1 className="text-2xl font-medium">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          We could not find the page or category you requested. Try browsing the
          catalog or searching for a product.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/" />}>Back to home</Button>
        <Button variant="outline" render={<Link href="/search" />}>
          Search products
        </Button>
      </div>
    </main>
  );
}
