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
    const literalSegments = url.pathname
      .split('/')
      .filter((segment) => segment !== '' && !segment.includes('*'));
    if (literalSegments.length === 0) {
      throw invalid('pathname needs at least one non-wildcard segment', entry);
    }
    return url;
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: parseImageRemotePatterns(process.env.IMAGE_REMOTE_PATTERNS),
  },
};

export default nextConfig;
