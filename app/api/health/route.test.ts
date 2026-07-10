/**
 * @vitest-environment node
 */
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

describe('GET /api/health', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok when commercetools is reachable', async () => {
    mockExecute.mockResolvedValue({
      body: { total: 117, count: 1, results: [] },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      projectKey: 'demo-project',
      productCountSample: 117,
    });
  });

  it('returns 500 when commercetools call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockRejectedValue(new Error('auth failed'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: 'Failed to connect to commercetools' });
  });
});
