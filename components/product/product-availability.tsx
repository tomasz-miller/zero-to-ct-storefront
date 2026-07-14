import type { StorefrontAvailability } from '@/lib/commercetools/product-mappers';
import { cn } from '@/lib/utils';

type ProductAvailabilityProps = {
  availability: StorefrontAvailability;
  className?: string;
  showInStock?: boolean;
};

export function ProductAvailability({
  availability,
  className,
  showInStock = false,
}: ProductAvailabilityProps) {
  if (availability.isOnStock && !showInStock) {
    return null;
  }

  const label = availability.isOnStock ? 'In stock' : 'Out of stock';

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
        availability.isOnStock
          ? 'bg-success/10 text-success-foreground'
          : 'bg-destructive/10 text-destructive-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}
