import { NextResponse } from "next/server";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { handleApiError } from "./http";

/**
 * Wraps a route handler with authentication and error translation.
 *
 * Every mutating endpoint needs the same three things: a signed-in user, a
 * try/catch, and a consistent error shape. Doing it here means each route file
 * is just "parse the request, call the service, return the result".
 */
export async function withUser(
  handler: (user: SessionUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Next 15+ passes dynamic route params as a promise. */
export type RouteContext = { params: Promise<{ id: string }> };

export async function routeId(context: RouteContext): Promise<string> {
  const { id } = await context.params;
  return id;
}

/** Read list options that every list endpoint shares. */
export function listOptions(request: Request) {
  const { searchParams } = new URL(request.url);
  const get = (key: string) => searchParams.get(key) ?? undefined;
  return {
    q: get("q"),
    sort: get("sort"),
    page: Number(get("page") ?? 1) || 1,
    raw: searchParams,
    get,
  };
}
