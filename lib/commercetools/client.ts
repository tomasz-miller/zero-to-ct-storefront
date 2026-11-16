import 'server-only';

import { ClientBuilder, type AuthMiddlewareOptions } from '@commercetools/ts-client';

import { commercetoolsEnv } from './env';
import { createHttpMiddlewareOptions } from './http-options';
import { ctSdkLoggerFn, shouldEnableSdkLogger } from './sdk-logger';

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: commercetoolsEnv.authUrl,
  projectKey: commercetoolsEnv.projectKey,
  credentials: {
    clientId: commercetoolsEnv.clientId,
    clientSecret: commercetoolsEnv.clientSecret,
  },
  scopes: [...commercetoolsEnv.scopes],
  httpClient: fetch,
};

const builder = new ClientBuilder()
  .withProjectKey(commercetoolsEnv.projectKey)
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(createHttpMiddlewareOptions())
  .withCorrelationIdMiddleware({ generate: () => crypto.randomUUID() })
  .withConcurrentModificationMiddleware();

if (shouldEnableSdkLogger()) {
  builder.withLoggerMiddleware({ loggerFn: ctSdkLoggerFn });
}

export const ctpClient = builder.build();
