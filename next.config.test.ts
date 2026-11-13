// @vitest-environment node
import { describe, expect, it } from 'vitest';

import nextConfig, { parseImageRemotePatterns } from './next.config';

describe('parseImageRemotePatterns', () => {
  it('uses the default sample-data pattern when unset', () => {
    expect(parseImageRemotePatterns(undefined).map(String)).toEqual([
      'https://storage.googleapis.com/merchant-center-europe/sample-data/**',
    ]);
  });

  it('parses comma-separated https patterns', () => {
    expect(
      parseImageRemotePatterns(
        ' https://a.example.com/bucket/** , https://b.example.com/x/** ',
      ).map((u) => u.hostname),
    ).toEqual(['a.example.com', 'b.example.com']);
  });

  it.each([
    'http://a.example.com/x/**',
    'https://**.amazonaws.com/x/**',
    'https://a.example.com/**',
    'https://a.example.com/',
    'not a url',
  ])('rejects unsafe pattern %s', (raw) => {
    expect(() => parseImageRemotePatterns(raw)).toThrow(/IMAGE_REMOTE_PATTERNS/);
  });

  it('wires the patterns into images.remotePatterns', () => {
    expect(nextConfig.images?.remotePatterns?.length).toBeGreaterThan(0);
  });
});
