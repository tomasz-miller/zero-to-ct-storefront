import { NextResponse } from 'next/server';

import { apiRoot } from '@/lib/commercetools/api-root';
import { commercetoolsEnv } from '@/lib/commercetools/env';

export async function GET() {
  try {
    const response = await apiRoot
      .productProjections()
      .get({ queryArgs: { limit: 1, staged: false } })
      .execute();

    return NextResponse.json({
      ok: true,
      projectKey: commercetoolsEnv.projectKey,
      productCountSample: response.body.total ?? response.body.count,
    });
  } catch (error) {
    console.error('[api/health]', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to connect to commercetools' },
      { status: 500 },
    );
  }
}
