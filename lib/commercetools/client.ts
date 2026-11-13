import 'server-only';

import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/ts-client';

import { commercetoolsEnv } from './env';
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

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: commercetoolsEnv.apiUrl,
  httpClient: fetch,
  includeRequestInErrorResponse: false,
};

const builder = new ClientBuilder()
  .withProjectKey(commercetoolsEnv.projectKey)
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .withCorrelationIdMiddleware({ generate: () => crypto.randomUUID() })
  .withConcurrentModificationMiddleware();

if (shouldEnableSdkLogger()) {
  builder.withLoggerMiddleware({ loggerFn: ctSdkLoggerFn });
}

export const ctpClient = builder.build();
