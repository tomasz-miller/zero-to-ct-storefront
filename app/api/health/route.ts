import { createHash, timingSafeEqual } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { apiRoot } from '@/lib/commercetools/api-root';
import { getCtCorrelationId, parseCtError } from '@/lib/commercetools/ct-errors';

const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function tokenMatches(expected: string, provided: string): boolean {
  // Equal-length digests: timingSafeEqual never sees (or leaks) the raw lengths.
  return timingSafeEqual(digest(expected), digest(provided));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.searchParams.get('check') !== 'commercetools') {
    return json({ ok: true });
  }

  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (!expected) {
    return json({ ok: false }, 404);
  }
  if (!tokenMatches(expected, request.headers.get('x-health-check-token') ?? '')) {
    return json({ ok: false }, 401);
  }

  try {
    await apiRoot
      .productProjections()
      .get({ queryArgs: { limit: 1, staged: false } })
      .execute();
    return json({ ok: true, commercetools: 'reachable' });
  } catch (error) {
    const parsed = parseCtError(error);
    console.error(
      '[api/health]',
      parsed.statusCode !== null
        ? {
            statusCode: parsed.statusCode,
            code: parsed.code,
            ctCorrelationId: getCtCorrelationId(error),
          }
        : { name: error instanceof Error ? error.name : typeof error },
    );
    return json({ ok: false }, 503);
  }
}
