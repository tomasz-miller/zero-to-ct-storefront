import { expect, it } from 'vitest';

import {
  isPasswordResetDeliveryConfigured,
  isPasswordResetDevLinkEnabled,
} from './password-reset-delivery';

it.each([
  [{ NODE_ENV: 'development', AUTH_DEV_EXPOSE_RESET_TOKEN: 'true' }, true],
  [{ NODE_ENV: 'development' }, false],
  [{ NODE_ENV: 'production', AUTH_DEV_EXPOSE_RESET_TOKEN: 'true' }, false],
  [{ NODE_ENV: 'test', AUTH_DEV_EXPOSE_RESET_TOKEN: 'true' }, false],
])('dev link for %o is %s', (env, expected) => {
  expect(isPasswordResetDevLinkEnabled(env as never)).toBe(expected);
  expect(isPasswordResetDeliveryConfigured(env as never)).toBe(expected);
});
