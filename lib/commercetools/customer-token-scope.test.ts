import { describe, expect, it } from 'vitest';

import { parseCustomerIdFromScope } from './customer-token-scope';

describe('parseCustomerIdFromScope', () => {
  it('extracts the customer id from the scope list', () => {
    expect(
      parseCustomerIdFromScope('manage_my_profile:demo manage_my_orders:demo customer_id:cust-1'),
    ).toBe('cust-1');
  });

  it('returns null when the entry is absent or empty', () => {
    expect(parseCustomerIdFromScope(undefined)).toBeNull();
    expect(parseCustomerIdFromScope('manage_my_profile:demo')).toBeNull();
    expect(parseCustomerIdFromScope('manage_my_profile:demo customer_id:')).toBeNull();
  });
});
