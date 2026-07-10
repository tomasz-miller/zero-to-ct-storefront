import { NextResponse } from 'next/server';

import { logoutCustomer } from '@/lib/commercetools/customer-auth';

export async function POST() {
  try {
    await logoutCustomer();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/auth/logout]', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
