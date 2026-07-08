import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-medium">
          zero-to-ct-storefront
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/search" />}>
            Search
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/cart" />}>
            Cart
          </Button>
        </nav>
      </div>
    </header>
  );
}
