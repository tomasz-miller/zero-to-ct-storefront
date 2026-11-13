/** Builds a plain commercetools SDK-style error: `{ statusCode, body.errors[0].code }`. */
export function ctErr(code: string, message = 'internal detail', statusCode = 400) {
  return Object.assign(new Error(message), {
    statusCode,
    body: { message, errors: [{ code, message }] },
  });
}
