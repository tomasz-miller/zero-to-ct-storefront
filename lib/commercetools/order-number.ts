import 'server-only';

import { randomBytes } from 'node:crypto';

/** `ZT-YYYYMMDD-XXXXXXXX`: UTC date plus 8 uppercase hex characters. */
export function createOrderNumber(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `ZT-${date}-${suffix}`;
}
