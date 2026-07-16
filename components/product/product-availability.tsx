import type { StorefrontAvailability } from '@/lib/commercetools/product-mappers';
import { cn } from '@/lib/utils';

type ProductAvailabilityProps = {
  availability: StorefrontAvailability;
  className?: string;
  showInStock?: boolean;
};

function availabilityLabel(availability: StorefrontAvailability): string {
  if (availability.status === 'out_of_stock') {
    return 'Out of stock';
  }

  if (availability.status === 'low_stock') {
    const quantity = availability.availableQuantity;
    return typeof quantity === 'number' ? `Only ${quantity} left` : 'Low stock';
  }

  return 'In stock';
}

export function ProductAvailability({
  availability,
  className,
  showInStock = false,
}: ProductAvailabilityProps) {
  if (availability.status === 'in_stock' && !showInStock) {
    return null;
  }

  const label = availabilityLabel(availability);

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
        availability.status === 'out_of_stock' &&
          'bg-destructive/10 text-destructive-foreground',
        availability.status === 'low_stock' &&
          'bg-warning/10 text-warning-foreground',
        availability.status === 'in_stock' &&
          'bg-success/10 text-success-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}
