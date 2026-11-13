import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isMockPaymentsEnabled } from '@/lib/commercetools/mock-payment';
import { getConfirmedOrderForSession } from '@/lib/commercetools/order-confirmation';

export default async function OrderConfirmationPage() {
  const order = await getConfirmedOrderForSession();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{order ? 'Thank you for your order' : 'Order status'}</CardTitle>
          <CardDescription>
            {order
              ? isMockPaymentsEnabled()
                ? 'Your demo payment was recorded. No real payment was taken.'
                : 'Your payment was submitted through commercetools Checkout.'
              : 'We could not confirm a recent order from this browser. Signed-in customers can find every order in their account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order ? (
            <p className="text-sm text-muted-foreground">
              Order number: <span className="font-mono">{order.orderNumber}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/search" />}>Continue shopping</Button>
            <Button variant="outline" render={<Link href="/" />}>
              Back to home
            </Button>
            {order ? null : (
              <Button variant="outline" render={<Link href="/account" />}>
                View account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
