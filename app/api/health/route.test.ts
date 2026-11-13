/**
 * @vitest-environment node
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecute, mockApiRoot } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockApiRoot = {
    productProjections: vi.fn(() => ({
      get: vi.fn(() => ({ execute: mockExecute })),
    })),
  };
  return { mockExecute, mockApiRoot };
});

vi.mock('@/lib/commercetools/api-root', () => ({
  apiRoot: mockApiRoot,
}));

vi.mock('@/lib/commercetools/env', () => ({
  commercetoolsEnv: {
    projectKey: 'demo-project',
    sessionUrl: 'https://session.example.com',
  },
}));

import { GET } from './route';

const TOKEN = 'a'.repeat(32);
const readiness = (token?: string) =>
  new NextRequest(
    'http://localhost/api/health?check=commercetools',
    token ? { headers: { 'x-health-check-token': token } } : {},
  );

describe('GET /api/health', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('answers liveness without calling commercetools', async () => {
    const res = await GET(new NextRequest('http://localhost/api/health'));
    expect(await res.json()).toEqual({ ok: true });
    expect(mockExecute).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('hides the readiness check when no token is configured', async () => {
    vi.stubEnv('HEALTH_CHECK_TOKEN', '');
    const res = await GET(readiness(TOKEN));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('rejects a wrong token', async () => {
    vi.stubEnv('HEALTH_CHECK_TOKEN', TOKEN);
    const res = await GET(readiness('b'));
    expect(res.status).toBe(401);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('reports reachable with the right token and never the project key', async () => {
    vi.stubEnv('HEALTH_CHECK_TOKEN', TOKEN);
    mockExecute.mockResolvedValue({ body: { results: [], total: 42 } });
    const res = await GET(readiness(TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, commercetools: 'reachable' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 503 when commercetools fails', async () => {
    vi.stubEnv('HEALTH_CHECK_TOKEN', TOKEN);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockRejectedValue(
      Object.assign(new Error('secret detail'), { statusCode: 401 }),
    );
    const res = await GET(readiness(TOKEN));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret detail');
  });
});
