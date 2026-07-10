import { NextRequest, NextResponse } from 'next/server';

import { getMyOrders } from '@/lib/commercetools/customer-api';
import { getValidCustomerAccessToken } from '@/lib/commercetools/customer-auth';

export async function GET(request: NextRequest) {
  const accessToken = await getValidCustomerAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const offsetParam = request.nextUrl.searchParams.get('offset');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
  }

  if (!Number.isFinite(offset) || offset < 0) {
    return NextResponse.json({ error: 'Invalid offset' }, { status: 400 });
  }

  try {
    const result = await getMyOrders({ limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/customer/orders]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
