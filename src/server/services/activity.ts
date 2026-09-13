import { prisma } from "@/lib/db";
import type {
  ActivityType,
  NotificationLevel,
  NotificationType,
} from "@/lib/constants";

/**
 * Activity log and notifications.
 *
 * Every service write calls `logActivity`, which is why the timeline is
 * complete: there is no code path that changes a record without recording it.
 * Keeping this in one module also means the timeline wording stays consistent.
 */

export type ActivityLink = {
  leadId?: string | null;
  clientId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  followUpId?: string | null;
};

export async function logActivity(input: {
  type: ActivityType;
  message: string;
  detail?: string | null;
  userId?: string | null;
  links?: ActivityLink;
}) {
  return prisma.activity.create({
    data: {
      type: input.type,
      message: input.message,
      detail: input.detail ?? null,
      userId: input.userId ?? null,
      ...input.links,
    },
  });
}

export async function notify(input: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  level?: NotificationLevel;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      level: input.level ?? "INFO",
      link: input.link ?? null,
    },
  });
}

/** Include shape used wherever a timeline is rendered. */
export const activityInclude = {
  user: { select: { id: true, name: true, avatarColor: true } },
} as const;

/** Most recent activity across the whole agency. */
export async function getRecentActivity(limit = 12) {
  return prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: activityInclude,
  });
}

/** Timeline for a single record, used on every detail page. */
export async function getActivityFor(
  link: keyof ActivityLink,
  id: string,
  limit = 30,
) {
  return prisma.activity.findMany({
    where: { [link]: id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: activityInclude,
  });
}

/**
 * Paged activity feed with an optional type filter, used by /activity.
 */
export async function listActivity(options: {
  page?: number;
  pageSize?: number;
  type?: string;
}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? 20;
  const where = options.type ? { type: options.type } : {};

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: activityInclude,
    }),
    prisma.activity.count({ where }),
  ]);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
