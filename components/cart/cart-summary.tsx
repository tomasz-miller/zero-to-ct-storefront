import { formatPrice } from '@/lib/format';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';
import { cn } from '@/lib/utils';

type CartSummaryProps = {
  cart: StorefrontCart;
  className?: string;
  showLineItems?: boolean;
};

export function CartSummary({
  cart,
  className,
  showLineItems = false,
}: CartSummaryProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showLineItems ? (
        <ul className="flex flex-col gap-2 text-sm">
          {cart.lineItems.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>
                {formatPrice(item.totalPrice.centAmount, item.totalPrice.currencyCode)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <span>Subtotal</span>
          <span>
            {formatPrice(cart.subtotal.centAmount, cart.subtotal.currencyCode)}
          </span>
        </div>

        {cart.savings ? (
          <div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400">
            <span>Savings</span>
            <span>
              −{formatPrice(cart.savings.centAmount, cart.savings.currencyCode)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex justify-between border-t pt-3 font-medium">
        <span>Total</span>
        <span>{formatPrice(cart.total.centAmount, cart.total.currencyCode)}</span>
      </div>
    </div>
  );
}
