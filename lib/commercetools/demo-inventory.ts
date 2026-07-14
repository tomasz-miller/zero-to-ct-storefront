/**
 * Demo inventory fixtures for E2E and DEMO_SCRIPT.
 * In-stock SKU is verified against the CT B2C sample project.
 */
export const DEMO_IN_STOCK_SKU = 'CARM-023';
export const DEMO_IN_STOCK_SLUG = 'charlie-armchair';

/**
 * Out-of-stock SKU — update if sample project inventory changes.
 * E2E tests discover OOS products dynamically when this SKU is in stock.
 */
export const DEMO_OUT_OF_STOCK_SKU = 'BARM-03';
export const DEMO_OUT_OF_STOCK_SLUG = 'bruno-armchair';
