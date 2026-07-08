export function formatPrice(centAmount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
  }).format(centAmount / 100);
}
