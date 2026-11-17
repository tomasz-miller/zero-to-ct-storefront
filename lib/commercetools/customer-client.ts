import 'server-only';

import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import type { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { ClientBuilder } from '@commercetools/ts-client';

import { commercetoolsEnv } from './env';
import { createHttpMiddlewareOptions } from './http-options';

/**
 * Request-scoped API root that acts as the signed-in customer: the bearer token is the customer's
 * own access token, so it can only reach `/me/**`. No concurrent-modification or logger middleware:
 * a `/me` 409 surfaces to the caller, and customer responses are never logged.
 */
export function createCustomerApiRoot(accessToken: string): ByProjectKeyRequestBuilder {
  const client = new ClientBuilder()
    .withProjectKey(commercetoolsEnv.projectKey)
    .withExistingTokenFlow(`Bearer ${accessToken}`, { force: true })
    .withHttpMiddleware(createHttpMiddlewareOptions())
    .withCorrelationIdMiddleware({ generate: () => crypto.randomUUID() })
    .build();

  return createApiBuilderFromCtpClient(client).withProjectKey({
    projectKey: commercetoolsEnv.projectKey,
  });
}
