import 'server-only';

import type {
  MiddlewareRequest,
  MiddlewareResponse,
} from '@commercetools/ts-client';

/** Writes that create or finalise money-related resources must not be replayed on a newer version. */
const NON_REBASEABLE_URI_TEMPLATES = new Set([
  '/{projectKey}/orders',
  '/{projectKey}/payments',
  '/{projectKey}/payments/{ID}',
]);

const NON_REBASEABLE_ACTIONS = new Set([
  'addPayment',
  'removePayment',
  'freezeCart',
  'unfreezeCart',
  'setCustomerId',
  'setCustomer',
  'setAnonymousId',
]);

function parseJsonBody(body: unknown): Record<string, unknown> | undefined {
  if (body instanceof Uint8Array) {
    return undefined;
  }

  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      return parsed !== null && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }

  return body !== null && typeof body === 'object'
    ? (body as Record<string, unknown>)
    : undefined;
}

/**
 * The default middleware resends every 409 with the current version. That is
 * only safe for idempotent cart and list edits: an order, a payment or a cart
 * freeze/payment change must surface the conflict to the caller instead.
 * Ownership changes (`setCustomerId`, `setCustomer`, `setAnonymousId`) also
 * surface the conflict, because the caller checked ownership at the original
 * version.
 */
export function shouldRebaseOnConcurrentModification(
  request: Pick<MiddlewareRequest, 'method' | 'uriTemplate' | 'body'>,
): boolean {
  if (
    request.uriTemplate &&
    NON_REBASEABLE_URI_TEMPLATES.has(request.uriTemplate)
  ) {
    return false;
  }

  if (request.body instanceof Uint8Array) {
    return false;
  }

  const parsed = parseJsonBody(request.body);
  if (typeof request.body === 'string' && !parsed) {
    return false;
  }

  const actions = parsed?.actions;
  if (Array.isArray(actions)) {
    return !actions.some(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        NON_REBASEABLE_ACTIONS.has((entry as { action?: unknown }).action as string),
    );
  }

  return true;
}

export async function concurrentModificationHandler(
  version: number,
  request: MiddlewareRequest,
  response: MiddlewareResponse,
): Promise<Record<string, unknown>> {
  if (!shouldRebaseOnConcurrentModification(request)) {
    throw response.error;
  }

  const parsed = parseJsonBody(request.body) ?? {};
  return { ...parsed, version };
}
