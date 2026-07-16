import { Suspense } from 'react';
import Link from 'next/link';

import { CheckoutEmbed } from '@/components/checkout/checkout-embed';
import { CartSummary } from '@/components/cart/cart-summary';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { customerCanUseDefaultAddress } from '@/lib/commercetools/checkout-cart-addresses';
import { getGuestCart } from '@/lib/commercetools/cart';
import { getAuthenticatedCustomerProfile } from '@/lib/commercetools/customer-auth';
import { getPublicCheckoutConfig, getStorefrontContext } from '@/lib/commercetools/storefront-context';

function CheckoutSkeleton() {
  return (
    <p className="text-sm text-muted-foreground">Preparing checkout…</p>
  );
}

export default async function CheckoutPage() {
  const cart = await getGuestCart();
  const customer = await getAuthenticatedCustomerProfile();
  const canUseDefaultAddress = customerCanUseDefaultAddress(customer);
  const checkoutConfig = await getPublicCheckoutConfig();
  const { locale } = await getStorefrontContext();

  if (!cart || cart.lineItems.length === 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Nothing to checkout</CardTitle>
            <CardDescription>Add products to your cart first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/search" />}>Browse products</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!checkoutConfig.projectKey) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-destructive">
          Missing NEXT_PUBLIC_CTP_PROJECT_KEY in environment.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <p className="text-sm text-muted-foreground">
            {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} in your order
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order summary</CardTitle>
          </CardHeader>
          <CardContent>
            <CartSummary cart={cart} showLineItems />
          </CardContent>
        </Card>
      </section>

      <section>
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutEmbed
            projectKey={checkoutConfig.projectKey}
            region={checkoutConfig.region}
            locale={locale}
            canUseDefaultAddress={canUseDefaultAddress}
          />
        </Suspense>
      </section>
    </main>
  );
}
