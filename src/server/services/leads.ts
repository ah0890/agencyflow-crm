import { prisma } from "@/lib/db";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  PAGE_SIZE,
  labelOf,
} from "@/lib/constants";
import {
  convertLeadSchema,
  createLeadSchema,
  updateLeadSchema,
} from "@/lib/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/server/errors";
import { logActivity, notify } from "./activity";

/**
 * Lead business logic.
 *
 * Route handlers and server components both call into here. Nothing outside
 * this module writes to the `lead` table, which is what guarantees every change
 * produces an activity entry.
 *
 * Note on search: SQLite's LIKE is already case-insensitive for ASCII, so
 * Prisma's `mode: "insensitive"` (unsupported on SQLite) is not needed.
 */

const listInclude = {
  owner: { select: { id: true, name: true, avatarColor: true } },
  convertedClient: { select: { id: true, name: true } },
} as const;

export type LeadListOptions = {
  q?: string;
  status?: string;
  source?: string;
  ownerId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

const SORTS: Record<string, Record<string, "asc" | "desc">> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  score: { score: "desc" },
  value: { estimatedValue: "desc" },
  name: { name: "asc" },
  followup: { nextFollowUpAt: "asc" },
};

export const LEAD_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "score", label: "Highest score" },
  { value: "value", label: "Highest value" },
  { value: "name", label: "Name A-Z" },
  { value: "followup", label: "Next follow-up" },
] as const;

export async function listLeads(options: LeadListOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const where = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    ...(options.q
      ? {
          OR: [
            { name: { contains: options.q } },
            { company: { contains: options.q } },
            { email: { contains: options.q } },
            { industry: { contains: options.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: SORTS[options.sort ?? "newest"] ?? SORTS.newest,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: listInclude,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getLead(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ...listInclude,
      deals: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { dueAt: "asc" } },
    },
  });
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

export async function createLead(input: unknown, actorId: string) {
  const data = createLeadSchema.parse(input);

  const lead = await prisma.lead.create({ data, include: listInclude });

  await logActivity({
    type: "LEAD_CREATED",
    message: `Lead ${lead.name} from ${lead.company} was added`,
    detail: `Source: ${labelOf(LEAD_SOURCES, lead.source)}`,
    userId: actorId,
    links: { leadId: lead.id },
  });

  // Tell the owner when someone else assigns them a lead.
  if (lead.ownerId !== actorId) {
    await notify({
      userId: lead.ownerId,
      title: "New lead assigned to you",
      body: `${lead.name} from ${lead.company} is now yours.`,
      type: "LEAD_ASSIGNED",
      level: "INFO",
      link: `/leads/${lead.id}`,
    });
  }

  return lead;
}

export async function updateLead(id: string, input: unknown, actorId: string) {
  const data = updateLeadSchema.parse(input);

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Lead");

  const lead = await prisma.lead.update({
    where: { id },
    data,
    include: listInclude,
  });

  // A status change is the event people care about, so it gets its own entry.
  if (data.status && data.status !== existing.status) {
    await logActivity({
      type: "LEAD_STATUS_CHANGED",
      message: `${lead.company} moved to ${labelOf(LEAD_STATUSES, lead.status)}`,
      detail: `${labelOf(LEAD_STATUSES, existing.status)} -> ${labelOf(LEAD_STATUSES, lead.status)}`,
      userId: actorId,
      links: { leadId: lead.id },
    });
  } else {
    await logActivity({
      type: "LEAD_UPDATED",
      message: `Lead ${lead.name} was updated`,
      userId: actorId,
      links: { leadId: lead.id },
    });
  }

  return lead;
}

export async function deleteLead(id: string, actorId: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError("Lead");

  await prisma.lead.delete({ where: { id } });

  // The lead's own activities cascade away with it, so this one is unlinked.
  await logActivity({
    type: "LEAD_DELETED",
    message: `Lead ${lead.name} from ${lead.company} was deleted`,
    userId: actorId,
  });

  return { id };
}

/**
 * Convert a lead into a client.
 *
 * This is the hand-off from sales to delivery and is the single most important
 * workflow in the app, so it runs in a transaction: either the client, the
 * link back to the lead and the optional deal all exist, or none of them do.
 */
export async function convertLead(
  id: string,
  input: unknown,
  actorId: string,
) {
  const options = convertLeadSchema.parse(input);

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError("Lead");
  if (lead.convertedClientId) {
    throw new BusinessRuleError("This lead has already been converted.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: lead.company,
        contactName: lead.name,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        status: "ACTIVE",
        notes: lead.notes,
        accountManagerId: options.accountManagerId,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id },
      data: {
        status: "WON",
        convertedAt: new Date(),
        convertedClientId: client.id,
      },
    });

    let deal = null;
    if (options.createDeal) {
      deal = await tx.deal.create({
        data: {
          title: `${lead.company} - New engagement`,
          company: lead.company,
          contactName: lead.name,
          value: options.dealValue ?? lead.estimatedValue,
          stage: "WON",
          probability: 100,
          closedAt: new Date(),
          ownerId: lead.ownerId,
          leadId: lead.id,
          clientId: client.id,
        },
      });
    }

    return { client, lead: updatedLead, deal };
  });

  await logActivity({
    type: "LEAD_CONVERTED",
    message: `${lead.company} was converted into a client`,
    detail: options.createDeal ? "A won deal was created alongside the client" : null,
    userId: actorId,
    links: { leadId: lead.id, clientId: result.client.id },
  });

  await logActivity({
    type: "CLIENT_CREATED",
    message: `${result.client.name} became a client`,
    detail: "Converted from a lead",
    userId: actorId,
    links: { clientId: result.client.id },
  });

  if (result.deal) {
    await logActivity({
      type: "DEAL_WON",
      message: `Deal won: ${result.deal.title}`,
      detail: `Value ${result.deal.value}`,
      userId: actorId,
      links: { dealId: result.deal.id, clientId: result.client.id },
    });
  }

  return result;
}

/** Counts per status, used by the leads page tabs and the dashboard funnel. */
export async function getLeadStatusCounts() {
  const rows = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

/** Lightweight list of open leads, for "related lead" <select> inputs. */
export async function getLeadOptions() {
  const leads = await prisma.lead.findMany({
    where: { status: { notIn: ["WON", "LOST"] } },
    orderBy: { company: "asc" },
    select: { id: true, name: true, company: true },
  });
  return leads.map((l) => ({ value: l.id, label: `${l.company} - ${l.name}` }));
}
