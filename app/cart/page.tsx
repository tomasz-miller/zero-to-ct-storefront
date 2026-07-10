import Link from 'next/link';

import { CartLineItems } from '@/components/cart/cart-line-items';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getGuestCart } from '@/lib/commercetools/cart';

export default async function CartPage() {
  const cart = await getGuestCart();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="text-sm text-muted-foreground">
          Review items before checkout.
        </p>
      </div>

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
