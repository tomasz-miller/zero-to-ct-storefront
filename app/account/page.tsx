import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyOrders } from '@/lib/commercetools/customer-api';
import { getAuthenticatedCustomerProfile } from '@/lib/commercetools/customer-auth';

function formatOrderDate(createdAt: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdAt));
}

function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
  }).format(new Date(createdAt));
}

function addressLabel(address: {
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
}): string | null {
  if (address.isDefaultBilling && address.isDefaultShipping) {
    return 'Default billing & shipping';
  }
  if (address.isDefaultBilling) {
    return 'Default billing';
  }
  if (address.isDefaultShipping) {
    return 'Default shipping';
  }
  return null;
}

export default async function AccountPage() {
  const customer = await getAuthenticatedCustomerProfile();

  if (!customer) {
    redirect('/?login=1');
  }

  const { orders, total } = await getMyOrders({ limit: 20, offset: 0 });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Your account</h1>
        <p className="text-sm text-muted-foreground">
          Profile details and order history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="text-right font-medium">{customer.displayName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="text-right font-medium">{customer.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Member since</span>
            <span className="text-right font-medium">
              {formatMemberSince(customer.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {customer.addresses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
            <CardDescription>Saved shipping and billing addresses.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {customer.addresses.map((address) => {
              const label = addressLabel(address);

              return (
                <div
                  key={address.id}
                  className="rounded-xl border p-4 text-sm"
                >
                  {label ? (
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                  ) : null}
                  <p>{address.formatted}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
          <CardDescription>
            {total > 0
              ? `${total} order${total === 1 ? '' : 's'} placed`
              : 'Orders you place will appear here.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
              <Button className="w-fit" render={<Link href="/search" />}>
                Browse products
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const orderLabel = order.orderNumber ?? order.id.slice(0, 8);

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link
                          className="underline-offset-4 hover:underline"
                          href={`/account/orders/${order.id}`}
                        >
                          {orderLabel}
                        </Link>
                      </TableCell>
                      <TableCell>{formatOrderDate(order.createdAt)}</TableCell>
                      <TableCell>
                        {order.orderState}
                        {order.paymentState ? ` / ${order.paymentState}` : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.total.formatted}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
