import { NextRequest } from 'next/server';

type JsonRequestInit = {
  method?: string;
  headers?: Record<string, string>;
};

/** Builds a `NextRequest` with a JSON body for route handler tests. */
export function jsonRequest(
  url: string,
  body: unknown,
  init: JsonRequestInit = {},
): NextRequest {
  return new NextRequest(url, {
    method: init.method ?? 'POST',
    headers: { 'content-type': 'application/json', ...init.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
