import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  BusinessRuleError,
  NotFoundError,
  UnauthorizedError,
} from "./errors";
import { toFieldErrors } from "@/lib/validation/common";

// Re-exported so route handlers can import errors and helpers from one place.
export { BusinessRuleError, NotFoundError, UnauthorizedError };

/**
 * One place that turns anything a service throws into an HTTP response.
 *
 * Route handlers stay three lines long because of this: validate, call the
 * service, return. No try/catch boilerplate repeated twelve times.
 */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Please correct the highlighted fields.",
        fieldErrors: toFieldErrors(error),
      },
      { status: 422 },
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  if (error instanceof BusinessRuleError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  console.error("[api] Unhandled error:", error);
  return NextResponse.json(
    { message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

/** Parse a JSON body, treating a malformed body as an empty object. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
