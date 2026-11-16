import { describe, expect, it } from 'vitest';

import { parseCartInventoryMode } from './cart-inventory-mode';

describe('parseCartInventoryMode', () => {
  it('defaults to ReserveOnOrder', () => {
    expect(parseCartInventoryMode(undefined)).toBe('ReserveOnOrder');
    expect(parseCartInventoryMode('')).toBe('ReserveOnOrder');
  });

  it.each(['None', 'TrackOnly', 'ReserveOnOrder'])('accepts %s', (mode) => {
    expect(parseCartInventoryMode(mode)).toBe(mode);
  });

  it('rejects ReserveOnCart and unknown values', () => {
    expect(() => parseCartInventoryMode('ReserveOnCart')).toThrow(/Invalid CTP_CART_INVENTORY_MODE/);
  });
});
