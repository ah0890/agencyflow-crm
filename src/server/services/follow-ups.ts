import { prisma } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";
import {
  createFollowUpSchema,
  updateFollowUpSchema,
} from "@/lib/validation/schemas";
import { NotFoundError } from "@/server/errors";
import { logActivity } from "./activity";

/**
 * Follow-up business logic.
 *
 * A follow-up always hangs off a lead or a client (enforced by the Zod schema),
 * which is what lets the detail pages show "what happens next" for any record.
 * Completing one against a lead also pushes the lead's own nextFollowUpAt
 * forward so the two views never disagree.
 */

const include = {
  owner: { select: { id: true, name: true, avatarColor: true } },
  lead: { select: { id: true, name: true, company: true } },
  client: { select: { id: true, name: true } },
} as const;

export type FollowUpListOptions = {
  q?: string;
  type?: string;
  ownerId?: string;
  /** "upcoming" | "overdue" | "completed" | "all" */
  scope?: string;
  page?: number;
  pageSize?: number;
};

export async function listFollowUps(options: FollowUpListOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const now = new Date();

  const scopeWhere =
    options.scope === "completed"
      ? { completed: true }
      : options.scope === "overdue"
        ? { completed: false, dueAt: { lt: now } }
        : options.scope === "all"
          ? {}
          : { completed: false };

  const where = {
    ...scopeWhere,
    ...(options.type ? { type: options.type } : {}),
    ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    ...(options.q
      ? {
          OR: [
            { title: { contains: options.q } },
            { notes: { contains: options.q } },
            { lead: { company: { contains: options.q } } },
            { client: { name: { contains: options.q } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      orderBy: { dueAt: options.scope === "completed" ? "desc" : "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
    prisma.followUp.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** The "next up" list on the dashboard. */
export async function getUpcomingFollowUps(limit = 6) {
  return prisma.followUp.findMany({
    where: { completed: false },
    orderBy: { dueAt: "asc" },
    take: limit,
    include,
  });
}

export async function createFollowUp(input: unknown, actorId: string) {
  const data = createFollowUpSchema.parse(input);

  const followUp = await prisma.followUp.create({ data, include });

  // Keep the lead's own "next follow-up" column in step.
  if (followUp.leadId) {
    await prisma.lead.update({
      where: { id: followUp.leadId },
      data: { nextFollowUpAt: followUp.dueAt },
    });
  }

  await logActivity({
    type: "FOLLOWUP_SCHEDULED",
    message: `Follow-up scheduled: ${followUp.title}`,
    detail: followUp.lead?.company ?? followUp.client?.name ?? null,
    userId: actorId,
    links: {
      followUpId: followUp.id,
      leadId: followUp.leadId,
      clientId: followUp.clientId,
    },
  });

  return followUp;
}

export async function updateFollowUp(
  id: string,
  input: unknown,
  actorId: string,
) {
  const data = updateFollowUpSchema.parse(input);

  const existing = await prisma.followUp.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Follow-up");

  const becameComplete = data.completed === true && !existing.completed;
  const reopened = data.completed === false && existing.completed;

  const followUp = await prisma.followUp.update({
    where: { id },
    data: {
      ...data,
      ...(becameComplete ? { completedAt: new Date() } : {}),
      ...(reopened ? { completedAt: null } : {}),
    },
    include,
  });

  await logActivity({
    type: becameComplete ? "FOLLOWUP_COMPLETED" : "FOLLOWUP_SCHEDULED",
    message: becameComplete
      ? `Follow-up completed: ${followUp.title}`
      : `Follow-up updated: ${followUp.title}`,
    detail: followUp.outcome ?? null,
    userId: actorId,
    links: {
      followUpId: followUp.id,
      leadId: followUp.leadId,
      clientId: followUp.clientId,
    },
  });

  // Once done, point the lead at its next outstanding touchpoint (if any).
  if (becameComplete && followUp.leadId) {
    const next = await prisma.followUp.findFirst({
      where: { leadId: followUp.leadId, completed: false },
      orderBy: { dueAt: "asc" },
      select: { dueAt: true },
    });
    await prisma.lead.update({
      where: { id: followUp.leadId },
      data: { nextFollowUpAt: next?.dueAt ?? null },
    });
  }

  return followUp;
}

/** One-click complete from a list row. */
export async function completeFollowUp(id: string, actorId: string) {
  return updateFollowUp(id, { completed: true }, actorId);
}

export async function deleteFollowUp(id: string, actorId: string) {
  const followUp = await prisma.followUp.findUnique({ where: { id } });
  if (!followUp) throw new NotFoundError("Follow-up");

  await prisma.followUp.delete({ where: { id } });
  await logActivity({
    type: "FOLLOWUP_DELETED",
    message: `Follow-up deleted: ${followUp.title}`,
    userId: actorId,
  });

  return { id };
}

export async function getFollowUpCounts() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);

  const [upcoming, overdue, completed] = await Promise.all([
    prisma.followUp.count({
      where: { completed: false, dueAt: { gte: now, lte: in7Days } },
    }),
    prisma.followUp.count({ where: { completed: false, dueAt: { lt: now } } }),
    prisma.followUp.count({ where: { completed: true } }),
  ]);

  return { upcoming, overdue, completed };
}
