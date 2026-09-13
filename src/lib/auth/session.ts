import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { UnauthorizedError } from "@/server/errors";

export { UnauthorizedError };

/**
 * Cookie-based sessions.
 *
 * The session is a signed JWT in an httpOnly cookie, so it cannot be read by
 * client-side JavaScript and cannot be tampered with without AUTH_SECRET. The
 * token carries only the user id; everything else is read fresh from the
 * database, so a deactivated user loses access immediately.
 *
 * This is deliberately small and dependency-light. Swapping in a hosted
 * provider later means replacing this file and nothing else.
 */

const COOKIE_NAME = "agencyflow_session";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Copy .env.example to .env and set it.",
    );
  }
  return new TextEncoder().encode(secret);
}

function maxAgeSeconds(): number {
  const days = Number(process.env.SESSION_MAX_AGE_DAYS ?? 7);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  avatarColor: string;
};

/** Issue a signed token and set it as an httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds()}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds(),
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read the current user, or null when signed out.
 * Wrapped in React `cache` so a single render resolves it once no matter how
 * many components ask.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    userId = payload.sub;
  } catch {
    // Expired or tampered token: treat as signed out.
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      avatarColor: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    avatarColor: user.avatarColor,
  };
});

/**
 * Use inside API route handlers and server actions. Throws `UnauthorizedError`
 * which the API error handler turns into a 401.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

