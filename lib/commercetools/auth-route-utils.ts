import { NextResponse } from 'next/server';

import { CustomerAuthError } from './customer-auth';

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof CustomerAuthError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  console.error('[auth]', error);
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
