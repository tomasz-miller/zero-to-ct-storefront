import * as z from 'zod';
import { describe, expect, it } from 'vitest';

import { jsonRequest } from '@/test/helpers/json-request';

import { parseJsonBody } from './parse-json-body';

const Schema = z.object({ name: z.string() });

describe('parseJsonBody', () => {
  it('accepts json content type with parameters and any case', async () => {
    for (const ct of [
      'application/json',
      'application/json; charset=utf-8',
      'APPLICATION/JSON',
    ]) {
      expect(
        (
          await parseJsonBody(
            jsonRequest('http://x/api', { name: 'a' }, { headers: { 'content-type': ct } }),
            Schema,
          )
        ).ok,
      ).toBe(true);
    }
  });

  it('rejects missing or non-json content type with 415', async () => {
    const plain = await parseJsonBody(
      jsonRequest('http://x/api', { name: 'a' }, { headers: { 'content-type': 'text/plain' } }),
      Schema,
    );
    // A Uint8Array body gets no implicit Content-Type (a string body would get text/plain;charset=UTF-8).
    const noTypeRequest = new Request('http://x/api', {
      method: 'POST',
      body: new TextEncoder().encode('{"name":"a"}'),
    });
    expect(noTypeRequest.headers.get('content-type')).toBeNull();
    const missing = await parseJsonBody(noTypeRequest, Schema);
    for (const r of [plain, missing]) {
      if (r.ok) throw new Error('expected failure');
      expect(r.response.status).toBe(415);
      expect(await r.response.json()).toEqual({
        error: 'Content-Type must be application/json',
      });
    }
  });

  it('rejects non-object JSON and empty bodies with 400', async () => {
    for (const body of ['null', '[]', '"x"', '1', '', '{bad']) {
      const r = await parseJsonBody(jsonRequest('http://x/api', body), Schema);
      if (r.ok) throw new Error(`expected failure for ${body}`);
      expect(r.response.status).toBe(400);
    }
  });

  it('returns the first issue message and field', async () => {
    const r = await parseJsonBody(jsonRequest('http://x/api', { name: 1 }), Schema);
    if (r.ok) throw new Error('expected failure');
    expect(await r.response.json()).toEqual({
      error: expect.any(String),
      field: 'name',
    });
  });

  it('rejects bodies over 65536 characters with 413', async () => {
    const r = await parseJsonBody(
      jsonRequest('http://x/api', { name: 'a'.repeat(70_000) }),
      Schema,
    );
    if (r.ok) throw new Error('expected failure');
    expect(r.response.status).toBe(413);
    expect(await r.response.json()).toEqual({ error: 'Request body too large' });
  });
});
