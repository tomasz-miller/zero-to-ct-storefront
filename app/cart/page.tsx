import Link from 'next/link';

import { CartLineItems } from '@/components/cart/cart-line-items';
import { ReorderNotice } from '@/components/cart/reorder-notice';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getGuestCart } from '@/lib/commercetools/cart';

type CartPageProps = {
  searchParams: Promise<{
    reorderAdded?: string;
    reorderSkipped?: string;
  }>;
};

function parseCount(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const params = await searchParams;
  const cart = await getGuestCart();
  const reorderAdded = parseCount(params.reorderAdded);
  const reorderSkipped = parseCount(params.reorderSkipped);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="text-sm text-muted-foreground">
          Review items before checkout.
        </p>
      </div>

      {reorderSkipped > 0 ? (
        <ReorderNotice added={reorderAdded} skipped={reorderSkipped} />
      ) : null}

      {!cart || cart.lineItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your cart is empty</CardTitle>
            <CardDescription>
              Browse products and add something to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/search" />}>Browse products</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <CartLineItems cart={cart} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
