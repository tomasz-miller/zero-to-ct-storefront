import { describe, expect, it } from 'vitest';

import { splitStoreName } from './store-brand';

describe('splitStoreName', () => {
  it('splits name around the emphasis substring', () => {
    expect(splitStoreName('Zero to CT storefront', 'CT')).toEqual([
      { text: 'Zero to ', emphasized: false },
      { text: 'CT', emphasized: true },
      { text: ' storefront', emphasized: false },
    ]);
  });

  it('returns the full name when emphasis is missing', () => {
    expect(splitStoreName('Acme Shop', 'CT')).toEqual([
      { text: 'Acme Shop', emphasized: false },
    ]);
  });

  it('handles repeated emphasis segments', () => {
    expect(splitStoreName('CT tools for CT teams', 'CT')).toEqual([
      { text: 'CT', emphasized: true },
      { text: ' tools for ', emphasized: false },
      { text: 'CT', emphasized: true },
      { text: ' teams', emphasized: false },
    ]);
  });
});
