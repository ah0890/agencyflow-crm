import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/server/errors";

/** Team directory and profile management. */

export async function getUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      avatarColor: true,
      _count: { select: { leads: true, deals: true, tasks: true } },
    },
  });
}

/** Lightweight list for "Assigned to" <select> inputs. */
export async function getUserOptions() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return users.map((u) => ({ value: u.id, label: u.name }));
}

export async function updateProfile(userId: string, input: unknown) {
  const data = updateProfileSchema.parse(input);

  // Email is the login identifier, so a clash has to be a clean error rather
  // than a database constraint failure.
  const clash = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: userId } },
    select: { id: true },
  });
  if (clash) {
    throw new BusinessRuleError("That email address is already in use.");
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      avatarColor: true,
    },
  });
}

export async function changePassword(userId: string, input: unknown) {
  const data = changePasswordSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new BusinessRuleError("Your current password is not correct.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });

  return { ok: true };
}

/** Per-person sales and delivery numbers for the Reports page. */
export async function getTeamPerformance() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, avatarColor: true, jobTitle: true },
  });

  const [wonByOwner, openByOwner, leadsByOwner, tasksByAssignee] =
    await Promise.all([
      prisma.deal.groupBy({
        by: ["ownerId"],
        where: { stage: "WON" },
        _sum: { value: true },
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["ownerId"],
        where: { stage: { notIn: ["WON", "LOST"] } },
        _sum: { value: true },
      }),
      prisma.lead.groupBy({ by: ["ownerId"], _count: { _all: true } }),
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { status: "COMPLETED" },
        _count: { _all: true },
      }),
    ]);

  const won = new Map(
    wonByOwner.map((r) => [r.ownerId, { value: r._sum.value ?? 0, count: r._count._all }]),
  );
  const open = new Map(openByOwner.map((r) => [r.ownerId, r._sum.value ?? 0]));
  const leads = new Map(leadsByOwner.map((r) => [r.ownerId, r._count._all]));
  const tasks = new Map(
    tasksByAssignee.map((r) => [r.assigneeId ?? "", r._count._all]),
  );

  return users
    .map((user) => ({
      ...user,
      wonValue: won.get(user.id)?.value ?? 0,
      wonCount: won.get(user.id)?.count ?? 0,
      openValue: open.get(user.id) ?? 0,
      leadCount: leads.get(user.id) ?? 0,
      tasksCompleted: tasks.get(user.id) ?? 0,
    }))
    .sort((a, b) => b.wonValue - a.wonValue);
}
