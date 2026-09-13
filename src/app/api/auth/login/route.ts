import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { handleApiError, ok, readJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    const { email, password } = loginSchema.parse(await readJson(request));

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always run the comparison, and always return the same message, so the
    // response cannot be used to discover which email addresses exist.
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!user || !valid || !user.isActive) {
      return Response.json(
        { message: "Those credentials do not match our records." },
        { status: 401 },
      );
    }

    await createSession(user.id);

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
