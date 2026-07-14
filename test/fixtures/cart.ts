import type { Cart } from '@commercetools/platform-sdk';

export function createCartFixture(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-1',
    version: 3,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastModifiedAt: '2024-01-01T00:00:00.000Z',
    lineItems: [
      {
        id: 'line-1',
        productId: 'prod-1',
        productKey: 'charlie-armchair',
        name: { 'en-GB': 'Charlie Armchair' },
        productType: { typeId: 'product-type', id: 'pt-1' },
        variant: {
          id: 1,
          sku: 'CARM-023',
          prices: [],
          images: [],
          attributes: [],
        },
        price: {
          id: 'price-1',
          value: {
            type: 'centPrecision',
            currencyCode: 'EUR',
            centAmount: 49900,
            fractionDigits: 2,
          },
        },
        quantity: 2,
        discountedPricePerQuantity: [],
        perMethodTaxRate: [],
        addedAt: '2024-01-01T00:00:00.000Z',
        lastModifiedAt: '2024-01-01T00:00:00.000Z',
        state: [],
        priceMode: 'Platform',
        lineItemMode: 'Standard',
        totalPrice: {
          type: 'centPrecision',
          currencyCode: 'EUR',
          centAmount: 6799,
          fractionDigits: 2,
        },
        taxedPricePortions: [],
      },
    ],
    cartState: 'Active',
    totalPrice: {
      type: 'centPrecision',
      currencyCode: 'EUR',
      centAmount: 6799,
      fractionDigits: 2,
    },
    discountCodes: [
      {
        discountCode: {
          typeId: 'discount-code',
          id: 'dc-1',
          obj: {
            id: 'dc-1',
            version: 1,
            createdAt: '2024-01-01T00:00:00.000Z',
            lastModifiedAt: '2024-01-01T00:00:00.000Z',
            code: 'BOGO',
            name: { 'en-GB': 'Buy one get one' },
            cartDiscounts: [],
            isActive: true,
            references: [],
            groups: [],
          },
        },
        state: 'MatchesCart',
      },
    ],
    ...overrides,
  } as Cart;
}
