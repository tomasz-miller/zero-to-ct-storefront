import type { CheckoutStyles } from '@commercetools/checkout-browser-sdk';

const DEFAULT_CHECKOUT_STYLES: CheckoutStyles = {
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
};

function resolveCssColor(variable: string, fallback: string): string {
  const probe = document.createElement('div');
  probe.style.display = 'none';
  probe.style.backgroundColor = `var(${variable})`;
  document.body.appendChild(probe);

  const resolved = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);

  return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : fallback;
}

export function resolveCheckoutSdkStyles(): CheckoutStyles {
  if (typeof document === 'undefined') {
    return DEFAULT_CHECKOUT_STYLES;
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const fontFamily =
    rootStyles.getPropertyValue('--font-sans').trim() ||
    DEFAULT_CHECKOUT_STYLES['--font-family'];
  const primary = resolveCssColor('--primary', '#27272a');
  const primaryForeground = resolveCssColor('--primary-foreground', '#fafafa');
  const mutedForeground = resolveCssColor('--muted-foreground', '#a1a1aa');

  return {
    '--font-family': fontFamily,
    '--button': primary,
    '--button-outline': primary,
    '--button-hover': primary,
    '--button-text': primaryForeground,
    '--button-disabled': mutedForeground,
    '--button-disabled-text': primaryForeground,
    '--input-field-focus': primary,
    '--checkbox': primary,
    '--radio': primary,
    '--spinner': primary,
  };
}
