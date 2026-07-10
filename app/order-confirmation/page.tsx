import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type OrderConfirmationPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function OrderConfirmationPage({
  searchParams,
}: OrderConfirmationPageProps) {
  const { orderId } = await searchParams;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Thank you for your order</CardTitle>
          <CardDescription>
            Your payment was submitted through commercetools Checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {orderId ? (
            <p className="text-sm text-muted-foreground">
              Order reference: <span className="font-mono">{orderId}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/search" />}>Continue shopping</Button>
            <Button variant="outline" render={<Link href="/" />}>
              Back to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
