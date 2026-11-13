/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadEnv = async () => {
  vi.resetModules();
  return (await import('./env')).commercetoolsEnv;
};

describe('commercetoolsEnv', () => {
  beforeEach(() => {
    vi.stubEnv('CTP_PROJECT_KEY', 'demo');
    vi.stubEnv('CTP_CLIENT_ID', 'client-id');
    vi.stubEnv('CTP_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('CTP_AUTH_URL', 'https://auth.example.com');
    vi.stubEnv('CTP_API_URL', 'https://api.example.com');
    vi.stubEnv('CTP_SESSION_URL', 'https://session.example.com');
    vi.stubEnv('CTP_SCOPES', 'view_products:demo');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves {pk} in the default customer scopes', async () => {
    expect((await loadEnv()).customerScopes).toBe('manage_my_profile:demo manage_my_orders:demo');
  });
  it('uses CTP_CUSTOMER_SCOPES when set and resolves {pk}', async () => {
    vi.stubEnv('CTP_CUSTOMER_SCOPES', 'manage_my_profile:{pk} manage_my_orders:{pk} manage_my_payments:{pk}');
    expect((await loadEnv()).customerScopes).toBe(
      'manage_my_profile:demo manage_my_orders:demo manage_my_payments:demo',
    );
  });
  it('exposes SESSION_SECRET without requiring it at import time', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    expect((await loadEnv()).sessionSecret).toBeUndefined();
    vi.stubEnv('SESSION_SECRET', 'c2VjcmV0');
    expect((await loadEnv()).sessionSecret).toBe('c2VjcmV0');
  });
});
