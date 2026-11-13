/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { createOrderNumber } from './order-number';

describe('createOrderNumber', () => {
  it('formats ZT-<UTC date>-<8 hex>', () => {
    expect(createOrderNumber(new Date('2026-11-13T23:30:00Z'))).toMatch(
      /^ZT-20261113-[0-9A-F]{8}$/,
    );
  });

  it('differs between calls', () => {
    expect(createOrderNumber()).not.toBe(createOrderNumber());
  });
});
