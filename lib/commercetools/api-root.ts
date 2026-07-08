import 'server-only';

import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

import { ctpClient } from './client';
import { commercetoolsEnv } from './env';

export const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({
  projectKey: commercetoolsEnv.projectKey,
});
