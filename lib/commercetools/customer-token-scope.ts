const CUSTOMER_ID_SCOPE_PREFIX = 'customer_id:';

/**
 * The commercetools authorization service adds a `customer_id:{id}` entry to the scope of
 * password-flow tokens. Returns that id, or null when the entry is absent or empty.
 * https://docs.commercetools.com/api/scopes#internal-oauth
 */
export function parseCustomerIdFromScope(scope: string | undefined): string | null {
  if (!scope) {
    return null;
  }
  for (const entry of scope.split(' ')) {
    if (entry.startsWith(CUSTOMER_ID_SCOPE_PREFIX)) {
      const id = entry.slice(CUSTOMER_ID_SCOPE_PREFIX.length);
      return id === '' ? null : id;
    }
  }
  return null;
}
