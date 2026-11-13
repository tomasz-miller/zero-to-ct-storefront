import { describe, expect, it } from 'vitest';

import { isStorefrontCountry, MARKETS, STOREFRONT_COUNTRIES } from './markets';

describe('markets', () => {
  it.each(STOREFRONT_COUNTRIES)('accepts %s', (c) =>
    expect(isStorefrontCountry(c)).toBe(true),
  );
  it.each(['de', 'FR', undefined, 42])('rejects %s', (v) =>
    expect(isStorefrontCountry(v)).toBe(false),
  );
  it('maps GB to GBP', () => expect(MARKETS.GB.currency).toBe('GBP'));
});
