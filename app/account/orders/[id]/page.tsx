import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { OrderDetail } from '@/components/account/order-detail';
import { Button } from '@/components/ui/button';
import {
  CustomerOrderNotFoundError,
  getMyOrder,
} from '@/lib/commercetools/customer-api';
import { getAuthenticatedCustomerProfile } from '@/lib/commercetools/customer-auth';

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const customer = await getAuthenticatedCustomerProfile();

  if (!customer) {
    redirect('/?login=1');
  }

  const { id } = await params;

  let order;
  try {
    order = await getMyOrder(id);
  } catch (error) {
    if (error instanceof CustomerOrderNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (!order) {
    redirect('/?login=1');
  }

  const orderLabel = order.orderNumber ?? order.id.slice(0, 8);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Button
          className="w-fit"
          variant="ghost"
          render={<Link href="/account" />}
        >
          Back to account
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Order {orderLabel}</h1>
          <p className="text-sm text-muted-foreground">
            Order details and delivery information.
          </p>
        </div>
      </div>

      <OrderDetail order={order} />
    </main>
  );
}
