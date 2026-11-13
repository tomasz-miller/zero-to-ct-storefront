import { describe, expect, it } from 'vitest';

import { clampInteger } from './query-params';

describe('clampInteger', () => {
  it.each([
    ['500', { min: 1, max: 100, fallback: 12 }, 100],
    ['abc', { min: 1, max: 100, fallback: 12 }, 12],
    ['1.5', { min: 1, max: 100, fallback: 12 }, 12],
    [null, { min: 1, max: 100, fallback: 12 }, 12],
    ['-3', { min: 0, max: 100, fallback: 5 }, 0],
  ] as const)('clampInteger(%j) → %d', (raw, options, expected) =>
    expect(clampInteger(raw, options)).toBe(expected),
  );
});
