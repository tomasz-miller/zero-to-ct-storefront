export const commercetoolsEnv = {
  projectKey: 'demo-project',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  authUrl: 'https://auth.example.com',
  apiUrl: 'https://api.example.com',
  sessionUrl: 'https://session.example.com',
  scopes: ['manage_orders:demo-project'],
  sessionSecret: Buffer.alloc(32, 7).toString('base64') as string | undefined,
  customerScopes: 'manage_my_profile:demo-project manage_my_orders:demo-project',
  checkoutApplicationKey: undefined as string | undefined,
};
