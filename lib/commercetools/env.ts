import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const commercetoolsEnv = {
  projectKey: required('CTP_PROJECT_KEY'),
  clientId: required('CTP_CLIENT_ID'),
  clientSecret: required('CTP_CLIENT_SECRET'),
  authUrl: required('CTP_AUTH_URL'),
  apiUrl: required('CTP_API_URL'),
  scopes: [required('CTP_SCOPES')],
} as const;
