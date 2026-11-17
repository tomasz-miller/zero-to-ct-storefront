/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

const builderChain = vi.hoisted(() => ({
  withProjectKey: vi.fn(),
  withClientCredentialsFlow: vi.fn(),
  withExistingTokenFlow: vi.fn(),
  withHttpMiddleware: vi.fn(),
  withCorrelationIdMiddleware: vi.fn(),
  withConcurrentModificationMiddleware: vi.fn(),
  withLoggerMiddleware: vi.fn(),
  build: vi.fn(() => ({ mocked: true })),
}));

vi.hoisted(() => {
  builderChain.withProjectKey.mockReturnValue(builderChain);
  builderChain.withClientCredentialsFlow.mockReturnValue(builderChain);
  builderChain.withExistingTokenFlow.mockReturnValue(builderChain);
  builderChain.withHttpMiddleware.mockReturnValue(builderChain);
  builderChain.withCorrelationIdMiddleware.mockReturnValue(builderChain);
  builderChain.withConcurrentModificationMiddleware.mockReturnValue(builderChain);
  builderChain.withLoggerMiddleware.mockReturnValue(builderChain);
});

const { mockCreateApiBuilderFromCtpClient } = vi.hoisted(() => ({
  mockCreateApiBuilderFromCtpClient: vi.fn(() => ({
    withProjectKey: vi.fn(() => ({ root: true })),
  })),
}));

vi.mock('./env', () => import('@/test/mocks/commercetools-env'));

vi.mock('@commercetools/ts-client', () => ({
  ClientBuilder: vi.fn(function ClientBuilder() {
    return builderChain;
  }),
}));

vi.mock('@commercetools/platform-sdk', () => ({
  createApiBuilderFromCtpClient: mockCreateApiBuilderFromCtpClient,
}));

import { createCustomerApiRoot } from './customer-client';

describe('createCustomerApiRoot', () => {
  it('builds a request-scoped client from the customer bearer token', () => {
    createCustomerApiRoot('tok-1');
    expect(builderChain.withExistingTokenFlow).toHaveBeenCalledWith('Bearer tok-1', { force: true });
    expect(builderChain.withHttpMiddleware).toHaveBeenCalledWith(expect.objectContaining({ enableRetry: true, includeRequestInErrorResponse: false }));
    expect(builderChain.withConcurrentModificationMiddleware).not.toHaveBeenCalled();
    expect(builderChain.withLoggerMiddleware).not.toHaveBeenCalled();
    expect(builderChain.withClientCredentialsFlow).not.toHaveBeenCalled();
  });
});
