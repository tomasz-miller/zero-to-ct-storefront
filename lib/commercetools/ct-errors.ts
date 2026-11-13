import type { ErrorObject } from '@commercetools/platform-sdk';

type ParsedCtError = {
  statusCode: number | null;
  code: string | null;
  message: string | null;
};

/**
 * Error for raw `fetch` calls to commercetools (token endpoints, Sessions API).
 * The message never contains the raw response body.
 */
export class CtFetchError extends Error {
  readonly statusCode: number;
  readonly body: unknown;
  readonly correlationId: string | null;

  constructor(statusCode: number, body: unknown, correlationId: string | null) {
    super(`commercetools request failed (${statusCode})`);
    this.name = 'CtFetchError';
    this.statusCode = statusCode;
    this.body = body;
    this.correlationId = correlationId;
  }
}

export function toCtFetchError(response: Response, rawBody: string): CtFetchError {
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  return new CtFetchError(
    response.status,
    body,
    response.headers.get('x-correlation-id'),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * ts-client throws `{ body: null, error }` for network failures; the real error
 * is the `error` property. HTTP errors carry a non-null `body`.
 */
function unwrapNetworkError(error: unknown): unknown {
  const record = asRecord(error);
  if (record && record.body == null && asRecord(record.error)) {
    return record.error;
  }
  return error;
}

function getErrorList(body: Record<string, unknown> | null): unknown[] {
  return Array.isArray(body?.errors) ? body.errors : [];
}

export function parseCtError(error: unknown): ParsedCtError {
  const none: ParsedCtError = { statusCode: null, code: null, message: null };
  const unwrapped = unwrapNetworkError(error);

  if (unwrapped instanceof CtFetchError) {
    const body = asRecord(unwrapped.body);
    return {
      statusCode: unwrapped.statusCode,
      code:
        asString(asRecord(getErrorList(body)[0])?.code) ?? asString(body?.error),
      message: asString(body?.message),
    };
  }

  const record = asRecord(unwrapped);
  if (!record) {
    return none;
  }

  const body = asRecord(record.body);
  const statusCode =
    typeof record.statusCode === 'number'
      ? record.statusCode
      : typeof body?.statusCode === 'number'
        ? body.statusCode
        : null;
  if (statusCode === null) {
    return none;
  }

  return {
    statusCode,
    code: asString(asRecord(getErrorList(body)[0])?.code) ?? asString(record.code),
    message: asString(body?.message) ?? asString(record.message),
  };
}

export function getCtErrorObjects(error: unknown): ErrorObject[] {
  const unwrapped = unwrapNetworkError(error);
  const body =
    unwrapped instanceof CtFetchError
      ? asRecord(unwrapped.body)
      : asRecord(asRecord(unwrapped)?.body);
  return getErrorList(body).filter(
    (entry): entry is ErrorObject =>
      asRecord(entry) !== null && typeof asRecord(entry)?.code === 'string',
  );
}

export function getCtCorrelationId(error: unknown): string | null {
  const unwrapped = unwrapNetworkError(error);
  if (unwrapped instanceof CtFetchError) {
    return unwrapped.correlationId;
  }

  const headers = asRecord(asRecord(unwrapped)?.headers);
  const value = headers?.['x-correlation-id'];
  if (Array.isArray(value)) {
    return asString(value[0]);
  }
  return asString(value);
}

export function isCtNotFound(error: unknown): boolean {
  const { statusCode, code } = parseCtError(error);
  return statusCode === 404 || code === 'ResourceNotFound';
}

export function isCtConcurrentModification(error: unknown): boolean {
  const { statusCode, code } = parseCtError(error);
  return code === 'ConcurrentModification' || statusCode === 409;
}
