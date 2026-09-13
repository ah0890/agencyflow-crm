import { prisma } from "@/lib/db";
import { NotFoundError } from "@/server/errors";

/**
 * Notifications come from two places.
 *
 * 1. Stored rows, written by the services when something happens (a lead is
 *    assigned to you, a deal you own is won). These are per-user and can be
 *    marked read.
 *
 * 2. Derived alerts, computed on read from the live data: follow-ups due,
 *    tasks overdue, project deadlines approaching. These are deliberately not
 *    stored - a due date is a condition, not an event, so recomputing it is
 *    always correct and can never produce duplicates or go stale.
 */

const MS_PER_DAY = 86_400_000;

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw new NotFoundError("Notification");

  return prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { count };
}

export async function deleteNotification(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw new NotFoundError("Notification");

  await prisma.notification.delete({ where: { id } });
  return { id };
}

export type Alerts = Awaited<ReturnType<typeof getAlerts>>;

/** Live "needs attention" conditions, recomputed on every read. */
export async function getAlerts(userId: string) {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 2 * MS_PER_DAY);
  const in7Days = new Date(now.getTime() + 7 * MS_PER_DAY);

  const [dueFollowUps, overdueTasks, deadlines] = await Promise.all([
    prisma.followUp.findMany({
      where: { completed: false, ownerId: userId, dueAt: { lte: in48Hours } },
      orderBy: { dueAt: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        dueAt: true,
        lead: { select: { company: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        status: { not: "COMPLETED" },
        assigneeId: userId,
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        dueDate: true,
        project: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        status: { in: ["PLANNING", "IN_PROGRESS"] },
        deadline: { gte: now, lte: in7Days },
      },
      orderBy: { deadline: "asc" },
      take: 5,
      select: { id: true, name: true, deadline: true },
    }),
  ]);

  return {
    dueFollowUps,
    overdueTasks,
    deadlines,
    total: dueFollowUps.length + overdueTasks.length + deadlines.length,
  };
}
