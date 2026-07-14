/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const builderChain = vi.hoisted(() => ({
  withProjectKey: vi.fn(),
  withClientCredentialsFlow: vi.fn(),
  withHttpMiddleware: vi.fn(),
  withCorrelationIdMiddleware: vi.fn(),
  withConcurrentModificationMiddleware: vi.fn(),
  withLoggerMiddleware: vi.fn(),
  build: vi.fn(() => ({ mocked: true })),
}));

vi.hoisted(() => {
  builderChain.withProjectKey.mockReturnValue(builderChain);
  builderChain.withClientCredentialsFlow.mockReturnValue(builderChain);
  builderChain.withHttpMiddleware.mockReturnValue(builderChain);
  builderChain.withCorrelationIdMiddleware.mockReturnValue(builderChain);
  builderChain.withConcurrentModificationMiddleware.mockReturnValue(builderChain);
  builderChain.withLoggerMiddleware.mockReturnValue(builderChain);
});

vi.mock('@/lib/commercetools/env', () => ({
  commercetoolsEnv: {
    projectKey: 'demo',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    authUrl: 'https://auth.example.com',
    apiUrl: 'https://api.example.com',
    scopes: ['manage_project:demo'],
  },
}));

vi.mock('@commercetools/ts-client', () => ({
  ClientBuilder: vi.fn(function ClientBuilder() {
    return builderChain;
  }),
}));

describe('ctpClient', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    builderChain.withProjectKey.mockReturnValue(builderChain);
    builderChain.withClientCredentialsFlow.mockReturnValue(builderChain);
    builderChain.withHttpMiddleware.mockReturnValue(builderChain);
    builderChain.withCorrelationIdMiddleware.mockReturnValue(builderChain);
    builderChain.withConcurrentModificationMiddleware.mockReturnValue(builderChain);
    builderChain.withLoggerMiddleware.mockReturnValue(builderChain);
  });

  it('registers correlation ID middleware in the client builder chain', async () => {
    await import('./client');

    expect(builderChain.withCorrelationIdMiddleware).toHaveBeenCalledWith({
      generate: expect.any(Function),
    });

    const [{ generate }] = builderChain.withCorrelationIdMiddleware.mock.calls[0] as [
      { generate: () => string },
    ];
    expect(generate()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
