import { prisma } from "@/lib/db";
import {
  DEAL_STAGES,
  OPEN_DEAL_STAGES,
  PAGE_SIZE,
  STAGE_PROBABILITY,
  labelOf,
  type DealStage,
} from "@/lib/constants";
import {
  createDealSchema,
  moveDealSchema,
  updateDealSchema,
} from "@/lib/validation/schemas";
import { NotFoundError } from "@/server/errors";
import { logActivity, notify } from "./activity";

/**
 * Deal / pipeline business logic.
 *
 * The stage transition rules live here rather than in the Kanban component, so
 * dragging a card and editing the stage in a form behave identically:
 *   - probability snaps to the stage default unless it was set by hand,
 *   - moving to Won or Lost stamps closedAt,
 *   - moving back out of Won/Lost clears it.
 */

const include = {
  owner: { select: { id: true, name: true, avatarColor: true } },
  client: { select: { id: true, name: true } },
  lead: { select: { id: true, name: true } },
} as const;

export const DEAL_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "value", label: "Highest value" },
  { value: "closing", label: "Closing soonest" },
] as const;

const SORTS: Record<string, object> = {
  newest: { createdAt: "desc" },
  value: { value: "desc" },
  closing: { expectedCloseDate: "asc" },
};

export type DealListOptions = {
  q?: string;
  stage?: string;
  ownerId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

function buildWhere(options: DealListOptions) {
  return {
    ...(options.stage ? { stage: options.stage } : {}),
    ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    ...(options.q
      ? {
          OR: [
            { title: { contains: options.q } },
            { company: { contains: options.q } },
            { contactName: { contains: options.q } },
          ],
        }
      : {}),
  };
}

export async function listDeals(options: DealListOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const where = buildWhere(options);

  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: (SORTS[options.sort ?? "newest"] ?? SORTS.newest) as never,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Flat list of every deal matching the filters, for the Kanban board.
 *
 * The board is not paged: it has to show the whole pipeline at once, which is
 * the point of the view.
 */
export async function listBoardDeals(options: DealListOptions = {}) {
  return prisma.deal.findMany({
    where: buildWhere(options),
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include,
  });
}

export async function getDeal(id: string) {
  const deal = await prisma.deal.findUnique({ where: { id }, include });
  if (!deal) throw new NotFoundError("Deal");
  return deal;
}

export async function createDeal(input: unknown, actorId: string) {
  const data = createDealSchema.parse(input);
  const stage = data.stage as DealStage;

  const deal = await prisma.deal.create({
    data: {
      ...data,
      probability: data.probability ?? STAGE_PROBABILITY[stage],
      closedAt: stage === "WON" || stage === "LOST" ? new Date() : null,
    },
    include,
  });

  await logActivity({
    type: "DEAL_CREATED",
    message: `Deal opened: ${deal.title}`,
    detail: `Value ${deal.value}`,
    userId: actorId,
    links: { dealId: deal.id, leadId: deal.leadId, clientId: deal.clientId },
  });

  return deal;
}

export async function updateDeal(id: string, input: unknown, actorId: string) {
  const data = updateDealSchema.parse(input);
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Deal");

  const stageChanged = Boolean(data.stage && data.stage !== existing.stage);
  const nextStage = (data.stage ?? existing.stage) as DealStage;

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...data,
      ...(stageChanged ? stageSideEffects(nextStage, data.probability) : {}),
    },
    include,
  });

  if (stageChanged) {
    await recordStageChange(deal, existing.stage, actorId);
  } else {
    await logActivity({
      type: "DEAL_UPDATED",
      message: `Deal updated: ${deal.title}`,
      userId: actorId,
      links: { dealId: deal.id },
    });
  }

  return deal;
}

/** Used by the Kanban board when a card is dropped into another column. */
export async function moveDeal(id: string, input: unknown, actorId: string) {
  const { stage, position } = moveDealSchema.parse(input);

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Deal");

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      stage,
      position: position ?? existing.position,
      ...stageSideEffects(stage as DealStage, undefined),
    },
    include,
  });

  if (existing.stage !== stage) {
    await recordStageChange(deal, existing.stage, actorId);
  }

  return deal;
}

export async function deleteDeal(id: string, actorId: string) {
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) throw new NotFoundError("Deal");

  await prisma.deal.delete({ where: { id } });
  await logActivity({
    type: "DEAL_DELETED",
    message: `Deal deleted: ${deal.title}`,
    userId: actorId,
  });

  return { id };
}

/** Totals shown above the pipeline board. */
export async function getPipelineSummary() {
  const [open, won, lost] = await Promise.all([
    prisma.deal.aggregate({
      where: { stage: { in: OPEN_DEAL_STAGES } },
      _sum: { value: true },
      _count: { _all: true },
    }),
    prisma.deal.aggregate({
      where: { stage: "WON" },
      _sum: { value: true },
      _count: { _all: true },
    }),
    prisma.deal.count({ where: { stage: "LOST" } }),
  ]);

  const decided = won._count._all + lost;

  return {
    openValue: open._sum.value ?? 0,
    openCount: open._count._all,
    wonValue: won._sum.value ?? 0,
    wonCount: won._count._all,
    lostCount: lost,
    winRate: decided ? (won._count._all / decided) * 100 : 0,
  };
}

/* ----------------------------- internal helpers ---------------------------- */

/** Field changes implied by landing in a given stage. */
function stageSideEffects(stage: DealStage, explicitProbability?: number) {
  const closing = stage === "WON" || stage === "LOST";
  return {
    probability: explicitProbability ?? STAGE_PROBABILITY[stage],
    closedAt: closing ? new Date() : null,
  };
}

async function recordStageChange(
  deal: { id: string; title: string; stage: string; value: number; ownerId: string },
  fromStage: string,
  actorId: string,
) {
  const type =
    deal.stage === "WON"
      ? "DEAL_WON"
      : deal.stage === "LOST"
        ? "DEAL_LOST"
        : "DEAL_STAGE_CHANGED";

  await logActivity({
    type,
    message:
      deal.stage === "WON"
        ? `Deal won: ${deal.title}`
        : deal.stage === "LOST"
          ? `Deal lost: ${deal.title}`
          : `${deal.title} moved to ${labelOf(DEAL_STAGES, deal.stage)}`,
    detail: `${labelOf(DEAL_STAGES, fromStage)} -> ${labelOf(DEAL_STAGES, deal.stage)}`,
    userId: actorId,
    links: { dealId: deal.id },
  });

  // A win or a loss is worth telling the deal owner about.
  if (deal.stage === "WON" || deal.stage === "LOST") {
    await notify({
      userId: deal.ownerId,
      title: deal.stage === "WON" ? "Deal won" : "Deal lost",
      body: `${deal.title} was marked ${labelOf(DEAL_STAGES, deal.stage).toLowerCase()}.`,
      type: "DEAL_STAGE_CHANGED",
      level: deal.stage === "WON" ? "SUCCESS" : "WARNING",
      link: `/deals`,
    });
  }
}
