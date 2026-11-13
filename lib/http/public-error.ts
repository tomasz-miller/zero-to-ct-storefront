/**
 * An error whose `message` is safe to show to shoppers by contract.
 * Anything that is not a `PublicError` maps to a generic 500 at the BFF edge.
 */
export class PublicError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'PublicError';
    this.status = status;
    this.code = code;
  }
}
