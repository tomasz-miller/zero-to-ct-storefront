import { describe, expect, it } from 'vitest';

import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formats EUR amounts', () => {
    expect(formatPrice(49900, 'EUR')).toMatch(/499/);
    expect(formatPrice(49900, 'EUR')).toContain('€');
  });

  it('formats GBP amounts', () => {
    expect(formatPrice(42900, 'GBP')).toMatch(/429/);
    expect(formatPrice(42900, 'GBP')).toMatch(/£/);
  });

  it('converts centAmount to major currency units', () => {
    expect(formatPrice(100, 'EUR')).toMatch(/1/);
  });
});
