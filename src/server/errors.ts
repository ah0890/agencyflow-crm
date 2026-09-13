/**
 * Domain errors, deliberately free of any framework imports.
 *
 * Services throw these; the HTTP layer (server/http.ts) maps them to status
 * codes. Keeping them in their own module means the business logic - and the
 * tests that exercise it - never has to pull in Next.js.
 */

/** A record id that does not exist. Becomes a 404. */
export class NotFoundError extends Error {
  constructor(what = "Record") {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

/** The request is valid but the action is not allowed. Becomes a 400. */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

/** No valid session. Becomes a 401. */
export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
