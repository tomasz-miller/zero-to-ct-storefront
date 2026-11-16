/** @vitest-environment node */
import { expect, it, vi } from 'vitest';
import { concurrentModificationHandler, shouldRebaseOnConcurrentModification } from './concurrent-modification';

function ctError(statusCode: number, code = 'Error', message = 'ct') {
  return Object.assign(new Error(message), { statusCode, code, body: { statusCode, message, errors: [{ code, message }] } });
}

it.each([
  ['/{projectKey}/orders', { cart: { typeId: 'cart', id: 'c1' }, version: 3 }],
  ['/{projectKey}/payments', { amountPlanned: {} }],
  ['/{projectKey}/payments/{ID}', { version: 3, actions: [{ action: 'setStatusInterfaceCode' }] }],
  ['/{projectKey}/carts/{ID}', { version: 3, actions: [{ action: 'addPayment' }] }],
  ['/{projectKey}/carts/{ID}', { version: 3, actions: [{ action: 'freezeCart' }] }],
  ['/{projectKey}/carts/{ID}', JSON.stringify({ version: 3, actions: [{ action: 'unfreezeCart' }] })],
  ['/{projectKey}/carts/{ID}', new Uint8Array([1])],
])('does not rebase %s', (uriTemplate, body) => {
  expect(shouldRebaseOnConcurrentModification({ method: 'POST', uriTemplate, body })).toBe(false);
});
it.each([
  ['/{projectKey}/carts/{ID}', { version: 3, actions: [{ action: 'addLineItem', sku: 'S', quantity: 1 }] }],
  ['/{projectKey}/carts/{ID}', JSON.stringify({ version: 3, actions: [{ action: 'changeLineItemQuantity', lineItemId: 'l', quantity: 2 }] })],
  ['/{projectKey}/shopping-lists/{ID}', { version: 3, actions: [{ action: 'removeLineItem', lineItemId: 'l' }] }],
])('rebases %s', (uriTemplate, body) => {
  expect(shouldRebaseOnConcurrentModification({ method: 'POST', uriTemplate, body })).toBe(true);
});
const response409 = { statusCode: 409, error: ctError(409, 'ConcurrentModification'), body: null, resolve: vi.fn(), reject: vi.fn() };
it('returns the body with the current version when rebaseable', async () => {
  const request = { method: 'POST', uriTemplate: '/{projectKey}/carts/{ID}', body: JSON.stringify({ version: 3, actions: [{ action: 'addLineItem' }] }) };
  await expect(concurrentModificationHandler(7, request as never, response409 as never)).resolves.toEqual({ version: 7, actions: [{ action: 'addLineItem' }] });
});
it('rethrows the original 409 error when not rebaseable', async () => {
  const request = { method: 'POST', uriTemplate: '/{projectKey}/orders', body: { version: 3 } };
  await expect(concurrentModificationHandler(7, request as never, response409 as never)).rejects.toBe(response409.error);
});
