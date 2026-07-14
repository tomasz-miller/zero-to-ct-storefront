import { NextResponse } from 'next/server';

import { CustomerAuthError } from './customer-auth';
import { CustomerProfileError } from './customer-profile-error';

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

export function customerErrorResponse(error: unknown): NextResponse {
  if (
    error instanceof CustomerProfileError ||
    error instanceof CustomerAuthError
  ) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  console.error('[customer]', error);
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
