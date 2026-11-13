// @vitest-environment node
import { describe, expect, it } from 'vitest';

import nextConfig, {
  parseImageRemotePatterns,
  securityHeaderRules,
} from './next.config';

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
    'https://a.example.com/**/x',
    'https://a.example.com/**/images/**',
    'not a url',
  ])('rejects unsafe pattern %s', (raw) => {
    expect(() => parseImageRemotePatterns(raw)).toThrow(/IMAGE_REMOTE_PATTERNS/);
  });

  it('wires the patterns into images.remotePatterns', () => {
    expect(nextConfig.images?.remotePatterns?.length).toBeGreaterThan(0);
  });
});

describe('securityHeaderRules', () => {
  type Rules = ReturnType<typeof securityHeaderRules>;
  const header = (rules: Rules, source: string, key: string) =>
    rules
      .find((r) => r.source === source)
      ?.headers.find((h) => h.key === key)?.value;

  it('enforces frame-ancestors none and basic hardening headers on every route', () => {
    const rules = securityHeaderRules({
      isDev: false,
      checkoutRegion: 'europe-west1.gcp',
    });
    expect(header(rules, '/(.*)', 'Content-Security-Policy')).toBe(
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    );
    expect(header(rules, '/(.*)', 'X-Frame-Options')).toBe('DENY');
    expect(header(rules, '/(.*)', 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(rules, '/(.*)', 'Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(header(rules, '/(.*)', 'Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
  });

  it('ships the full policy as report-only with the regional checkout host', () => {
    const ro = header(
      securityHeaderRules({ isDev: false, checkoutRegion: 'us-central1.gcp' }),
      '/(.*)',
      'Content-Security-Policy-Report-Only',
    );
    expect(ro).toContain(
      'frame-src https://app.checkout.us-central1.gcp.commercetools.com',
    );
    expect(ro).not.toContain("'unsafe-eval'");
  });

  it("adds 'unsafe-eval' only in development", () => {
    const ro = header(
      securityHeaderRules({ isDev: true, checkoutRegion: 'europe-west1.gcp' }),
      '/(.*)',
      'Content-Security-Policy-Report-Only',
    );
    expect(ro).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.checkout.europe-west1.gcp.commercetools.com",
    );
  });

  it('sends no-referrer on /reset-password after the global rule', () => {
    const rules = securityHeaderRules({
      isDev: false,
      checkoutRegion: 'europe-west1.gcp',
    });
    expect(
      rules.findIndex((r) => r.source === '/reset-password'),
    ).toBeGreaterThan(rules.findIndex((r) => r.source === '/(.*)'));
    expect(header(rules, '/reset-password', 'Referrer-Policy')).toBe(
      'no-referrer',
    );
  });

  it('exposes the rules through nextConfig.headers()', async () => {
    expect(await nextConfig.headers!()).toHaveLength(2);
  });
});
