import Link from 'next/link';

import { WishlistLineItems } from '@/components/wishlist/wishlist-line-items';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getWishlist } from '@/lib/commercetools/shopping-lists';

export default async function WishlistPage() {
  const wishlist = await getWishlist();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Your wishlist</h1>
        <p className="text-sm text-muted-foreground">
          Save products for later and move them to your cart when ready.
        </p>
      </div>

      {!wishlist || wishlist.lineItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your wishlist is empty</CardTitle>
            <CardDescription>
              Browse products and tap the heart icon to save items here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/search" />}>Browse products</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <WishlistLineItems wishlist={wishlist} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
