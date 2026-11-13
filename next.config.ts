import type { NextConfig } from 'next';

// UNVERIFIED: assumed host/prefix of the commercetools B2C sample data; confirm against a live project.
export const DEFAULT_IMAGE_REMOTE_PATTERNS: readonly string[] = [
  'https://storage.googleapis.com/merchant-center-europe/sample-data/**',
];

function invalid(reason: string, entry: string): Error {
  return new Error(`IMAGE_REMOTE_PATTERNS: ${reason} (${entry})`);
}

/**
 * Parses the comma-separated IMAGE_REMOTE_PATTERNS value into URL patterns for
 * `images.remotePatterns`. Every entry must be https, have a literal hostname
 * and pin at least one literal path segment before any wildcard. A bad value
 * throws so that `next build` fails instead of widening the image proxy.
 */
export function parseImageRemotePatterns(raw: string | undefined): URL[] {
  const entries = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const sources = entries.length > 0 ? entries : DEFAULT_IMAGE_REMOTE_PATTERNS;

  return sources.map((entry) => {
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw invalid('not a valid URL', entry);
    }
    if (url.protocol !== 'https:') {
      throw invalid('protocol must be https', entry);
    }
    if (url.hostname.includes('*')) {
      throw invalid('hostname must not contain wildcards', entry);
    }
    const firstSegment = url.pathname.split('/')[1] ?? '';
    if (firstSegment === '' || firstSegment.includes('*')) {
      throw invalid(
        'pathname must start with a non-wildcard segment before any wildcard',
        entry,
      );
    }
    return url;
  });
}

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

const join = (directives: string[]): string => directives.join('; ');

/**
 * Security headers for every route. Only the framing/plugin/base-uri
 * directives are enforced; the full policy is report-only until the checkout
 * and PSP flows are verified (see docs/CHECKOUT.md, "Content Security Policy").
 * The `/reset-password` rule is listed last so its Referrer-Policy overrides
 * the global one (later rules win for the same header key).
 */
export function securityHeaderRules(options: {
  isDev: boolean;
  checkoutRegion: string;
}): HeaderRule[] {
  const checkoutHost = `https://app.checkout.${options.checkoutRegion}.commercetools.com`;
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(options.isDev ? ["'unsafe-eval'"] : []),
    checkoutHost,
    'https://js.stripe.com',
  ].join(' ');

  const enforced = join([
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ]);
  const reportOnly = join([
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.commercetools.com https://api.stripe.com",
    `frame-src ${checkoutHost} https://js.stripe.com https://hooks.stripe.com`,
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ]);

  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: enforced },
        { key: 'Content-Security-Policy-Report-Only', value: reportOnly },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
    {
      source: '/reset-password',
      headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: parseImageRemotePatterns(process.env.IMAGE_REMOTE_PATTERNS),
  },
  async headers() {
    return securityHeaderRules({
      isDev: process.env.NODE_ENV === 'development',
      checkoutRegion: process.env.NEXT_PUBLIC_CTP_REGION ?? 'europe-west1.gcp',
    });
  },
};

export default nextConfig;
