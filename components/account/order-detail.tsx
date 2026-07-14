import Image from 'next/image';

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
import type { StorefrontOrderDetail } from '@/lib/commercetools/customer-mappers';

function formatOrderDate(createdAt: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdAt));
}

type OrderDetailProps = {
  order: StorefrontOrderDetail;
};

export function OrderDetail({ order }: OrderDetailProps) {
  const orderLabel = order.orderNumber ?? order.id.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Order {orderLabel}</CardTitle>
          <CardDescription>
            Placed on {formatOrderDate(order.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <span className="text-right font-medium">
              {order.orderState}
              {order.paymentState ? ` / ${order.paymentState}` : ''}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-right font-medium">{order.total.formatted}</span>
          </div>
          {order.shippingMethod ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Shipping method</span>
              <span className="text-right font-medium">{order.shippingMethod}</span>
            </div>
          ) : null}
          {order.shippingCost ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Shipping cost</span>
              <span className="text-right font-medium">
                {order.shippingCost.formatted}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {order.lineItems.length} item{order.lineItems.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {order.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No line items on this order.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {order.lineItems.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-xl border p-4"
                >
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.sku ? (
                          <p className="text-sm text-muted-foreground">{item.sku}</p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          Qty {item.quantity} · {item.unitPrice.formatted} each
                        </p>
                      </div>
                      <p className="text-sm font-medium">{item.totalPrice.formatted}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(order.shippingAddress ?? order.billingAddress) ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {order.shippingAddress ? (
            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.shippingAddress.formatted}</p>
              </CardContent>
            </Card>
          ) : null}
          {order.billingAddress ? (
            <Card>
              <CardHeader>
                <CardTitle>Billing address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.billingAddress.formatted}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.shippingCost ? (
                <TableRow>
                  <TableCell>Shipping</TableCell>
                  <TableCell className="text-right">
                    {order.shippingCost.formatted}
                  </TableCell>
                </TableRow>
              ) : null}
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right font-medium">
                  {order.total.formatted}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
