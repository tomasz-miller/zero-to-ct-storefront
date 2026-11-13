import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const projectKey = required('CTP_PROJECT_KEY');

export const commercetoolsEnv = {
  projectKey,
  clientId: required('CTP_CLIENT_ID'),
  clientSecret: required('CTP_CLIENT_SECRET'),
  authUrl: required('CTP_AUTH_URL'),
  apiUrl: required('CTP_API_URL'),
  sessionUrl: required('CTP_SESSION_URL'),
  scopes: [required('CTP_SCOPES')],
  // Optional so `next build` and CI do not need it; the sealing module enforces it at first use.
  sessionSecret: optional('SESSION_SECRET'),
  customerScopes: (optional('CTP_CUSTOMER_SCOPES') ?? 'manage_my_profile:{pk} manage_my_orders:{pk}').replaceAll(
    '{pk}',
    projectKey,
  ),
  checkoutApplicationKey: optional('CTP_CHECKOUT_APPLICATION_KEY'),
} as const;
