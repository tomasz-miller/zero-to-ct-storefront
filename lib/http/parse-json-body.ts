import 'server-only';

import { NextResponse } from 'next/server';
import type * as z from 'zod';

export const MAX_JSON_BODY_CHARS = 65_536;

export type ParsedJsonBody<S extends z.ZodType> =
  | { ok: true; data: z.infer<S> }
  | { ok: false; response: NextResponse };

function failure(error: string, status: number, field?: string) {
  return {
    ok: false as const,
    response: NextResponse.json(
      field === undefined ? { error } : { error, field },
      { status },
    ),
  };
}

/**
 * Parses and validates a JSON request body. A handler only reads a body that is
 * declared `application/json`, so a cross-site `text/plain` form post cannot
 * reach it.
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<ParsedJsonBody<S>> {
  const mediaType = (request.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (mediaType !== 'application/json') {
    return failure('Content-Type must be application/json', 415);
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return failure('Invalid JSON body', 400);
  }
  if (text.length > MAX_JSON_BODY_CHARS) {
    return failure('Request body too large', 413);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return failure('Invalid JSON body', 400);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return failure(
      issue?.message ?? 'Invalid request body',
      400,
      issue?.path.join('.') || undefined,
    );
  }
  return { ok: true, data: result.data };
}
