import { formatPrice } from '@/lib/format';
import type { StorefrontPrice } from '@/lib/commercetools/product-mappers';
import { cn } from '@/lib/utils';

type ProductPriceProps = {
  price?: StorefrontPrice;
  className?: string;
  unavailableLabel?: string;
};

export function ProductPrice({
  price,
  className,
  unavailableLabel = 'Price unavailable',
}: ProductPriceProps) {
  if (!price) {
    return <span className={cn('text-muted-foreground', className)}>{unavailableLabel}</span>;
  }

  if (price.isDiscounted && price.originalCentAmount !== undefined) {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
        <span className="font-medium text-foreground">
          {formatPrice(price.centAmount, price.currencyCode)}
        </span>
        <span className="text-muted-foreground line-through">
          {formatPrice(price.originalCentAmount, price.currencyCode)}
        </span>
      </span>
    );
  }

  return (
    <span className={className}>
      {formatPrice(price.centAmount, price.currencyCode)}
    </span>
  );
}
