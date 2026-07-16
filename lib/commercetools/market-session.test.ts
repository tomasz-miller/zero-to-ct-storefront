import { describe, expect, it } from 'vitest';

import { parseMarketPreference } from './market-session';

describe('parseMarketPreference', () => {
  it('parses supported storefront countries', () => {
    expect(parseMarketPreference('DE')).toBe('DE');
    expect(parseMarketPreference('GB')).toBe('GB');
    expect(parseMarketPreference('US')).toBe('US');
  });

  it('returns null for missing or unsupported values', () => {
    expect(parseMarketPreference(undefined)).toBeNull();
    expect(parseMarketPreference('FR')).toBeNull();
  });
});
