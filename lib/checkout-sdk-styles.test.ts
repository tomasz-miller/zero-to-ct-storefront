import { describe, expect, it, vi } from 'vitest';

import { resolveCheckoutSdkStyles } from './checkout-sdk-styles';

describe('resolveCheckoutSdkStyles', () => {
  it('returns default styles when document is unavailable', () => {
    const originalDocument = globalThis.document;
    vi.stubGlobal('document', undefined);

    try {
      expect(resolveCheckoutSdkStyles()).toEqual({
        '--font-family': 'Arial, sans-serif',
        '--button': '#27272a',
        '--button-outline': '#27272a',
        '--button-hover': '#18181b',
        '--button-text': '#fafafa',
        '--button-disabled': '#a1a1aa',
        '--button-disabled-text': '#fafafa',
        '--input-field-focus': '#27272a',
        '--checkbox': '#27272a',
        '--radio': '#27272a',
        '--spinner': '#27272a',
      });
    } finally {
      vi.stubGlobal('document', originalDocument);
    }
  });
});
