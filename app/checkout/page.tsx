import { Suspense } from 'react';
import Link from 'next/link';

import {
  CheckoutEmbed,
} from '@/components/checkout/checkout-embed';
import { MockCheckoutForm } from '@/components/checkout/mock-checkout-form';
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
import { mockCheckoutDefaults } from '@/components/checkout/mock-checkout-defaults';
import { isMockPaymentsEnabled } from '@/lib/commercetools/mock-payment';
import { getPublicCheckoutConfig, getStorefrontContext } from '@/lib/commercetools/storefront-context';

function CheckoutSkeleton() {
  return (
    <p className="text-sm text-muted-foreground">Preparing checkout…</p>
  );
}

export default async function CheckoutPage() {
  const mockPayments = isMockPaymentsEnabled();
  const cart = await getGuestCart();
  const customer = await getAuthenticatedCustomerProfile();
  const canUseDefaultAddress = customerCanUseDefaultAddress(customer);
  const checkoutConfig = await getPublicCheckoutConfig();
  const { country, locale } = await getStorefrontContext();

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

  if (!mockPayments && !checkoutConfig.projectKey) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-destructive">
          Missing NEXT_PUBLIC_CTP_PROJECT_KEY in environment.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      {/* Checkout's desktop skin is a 940px row with its own summary column.
          A page sidebar squeezes that row below its minimum and the address
          fields collide with the summary background. */}
      <section className="flex w-full max-w-lg flex-col gap-4">
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
        {mockPayments ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demo payment</CardTitle>
            </CardHeader>
            <CardContent>
              <MockCheckoutForm
                country={country}
                defaults={mockCheckoutDefaults(customer, country)}
              />
            </CardContent>
          </Card>
        ) : null}
      </section>

      {mockPayments ? null : (
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
      )}
    </main>
  );
}
