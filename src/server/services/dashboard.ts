import { prisma } from "@/lib/db";
import {
  ACTIVE_PROJECT_STATUSES,
  DEAL_STAGES,
  LEAD_FUNNEL_ORDER,
  LEAD_SOURCES,
  LEAD_STATUSES,
  OPEN_DEAL_STAGES,
  PROJECT_STATUSES,
  STAGE_PROBABILITY,
  labelOf,
} from "@/lib/constants";
import { safeRate } from "@/lib/utils";

/**
 * Dashboard aggregation.
 *
 * Everything the dashboard shows is derived from the same tables the rest of
 * the app writes to - there is no summary table to fall out of date. The whole
 * page is one round of parallel queries, so it renders on the server in a
 * single pass.
 *
 * Monthly grouping happens in JavaScript because SQLite has no date_trunc and
 * the working set here is small (won deals from the last six months).
 */

const MS_PER_DAY = 86_400_000;

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);
  const sevenDaysAhead = new Date(now.getTime() + 7 * MS_PER_DAY);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalLeads,
    newLeads,
    wonLeads,
    activeClients,
    activeProjects,
    openDeals,
    wonDeals,
    pendingTasks,
    overdueTasks,
    upcomingFollowUps,
    overdueFollowUps,
    leadsByStatus,
    leadsBySource,
    dealsByStage,
    projectsByStatus,
    wonDealRows,
    recentActivity,
    nextFollowUps,
    topDeals,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { status: { in: ACTIVE_PROJECT_STATUSES } } }),
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
    prisma.task.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.task.count({
      where: { status: { not: "COMPLETED" }, dueDate: { lt: now } },
    }),
    prisma.followUp.count({
      where: { completed: false, dueAt: { gte: now, lte: sevenDaysAhead } },
    }),
    prisma.followUp.count({
      where: { completed: false, dueAt: { lt: now } },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ["source"],
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.deal.groupBy({
      by: ["stage"],
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.deal.findMany({
      where: { stage: "WON", closedAt: { gte: sixMonthsAgo } },
      select: { value: true, closedAt: true },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
    }),
    prisma.followUp.findMany({
      where: { completed: false },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        lead: { select: { id: true, company: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.deal.findMany({
      where: { stage: { in: OPEN_DEAL_STAGES } },
      orderBy: { value: "desc" },
      take: 5,
      include: { owner: { select: { id: true, name: true, avatarColor: true } } },
    }),
  ]);

  const leadStatusCounts = countMap(leadsByStatus, "status");
  const dealStageCounts = new Map(
    dealsByStage.map((r) => [
      r.stage,
      { count: r._count._all, value: r._sum.value ?? 0 },
    ]),
  );

  /* --------------------------------- KPIs --------------------------------- */

  const pipelineValue = openDeals._sum.value ?? 0;
  const wonValue = wonDeals._sum.value ?? 0;
  const lostCount = dealStageCounts.get("LOST")?.count ?? 0;
  const decidedDeals = wonDeals._count._all + lostCount;

  // Weighted pipeline: each open deal counted at its stage win probability.
  // A more honest forecast number than raw pipeline value.
  const weightedPipeline = OPEN_DEAL_STAGES.reduce((sum, stage) => {
    const entry = dealStageCounts.get(stage);
    if (!entry) return sum;
    return sum + entry.value * (STAGE_PROBABILITY[stage] / 100);
  }, 0);

  const kpis = {
    totalLeads,
    newLeads,
    activeClients,
    activeProjects,
    pipelineValue,
    weightedPipeline,
    openDealCount: openDeals._count._all,
    wonDealCount: wonDeals._count._all,
    wonValue,
    pendingTasks,
    overdueTasks,
    upcomingFollowUps,
    overdueFollowUps,
    winRate: safeRate(wonDeals._count._all, decidedDeals),
    leadConversionRate: safeRate(wonLeads, totalLeads),
    averageDealSize: wonDeals._count._all
      ? wonValue / wonDeals._count._all
      : 0,
  };

  /* -------------------------------- charts -------------------------------- */

  const funnel = LEAD_FUNNEL_ORDER.map((status) => ({
    key: status,
    label: labelOf(LEAD_STATUSES, status),
    count: leadStatusCounts.get(status) ?? 0,
  }));

  const pipelineByStage = DEAL_STAGES.filter(
    (s) => s.value !== "LOST",
  ).map((stage) => ({
    key: stage.value,
    label: stage.label,
    count: dealStageCounts.get(stage.value)?.count ?? 0,
    value: dealStageCounts.get(stage.value)?.value ?? 0,
  }));

  const projectStatusCounts = countMap(projectsByStatus, "status");
  const projectsByStatusChart = PROJECT_STATUSES.map((status) => ({
    key: status.value,
    label: status.label,
    tone: status.tone,
    count: projectStatusCounts.get(status.value) ?? 0,
  })).filter((row) => row.count > 0);

  const sourceCounts = new Map(
    leadsBySource.map((r) => [
      r.source,
      { count: r._count._all, value: r._sum.estimatedValue ?? 0 },
    ]),
  );
  const leadsBySourceChart = LEAD_SOURCES.map((source) => ({
    key: source.value,
    label: source.label,
    count: sourceCounts.get(source.value)?.count ?? 0,
    value: sourceCounts.get(source.value)?.value ?? 0,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const monthlyRevenue = buildMonthlySeries(wonDealRows, now, 6);

  return {
    kpis,
    charts: {
      funnel,
      pipelineByStage,
      projectsByStatus: projectsByStatusChart,
      leadsBySource: leadsBySourceChart,
      monthlyRevenue,
    },
    recentActivity,
    nextFollowUps,
    topDeals,
  };
}

/* ------------------------------ local helpers ----------------------------- */

function countMap<T extends string>(
  rows: Array<Record<string, unknown> & { _count: { _all: number } }>,
  key: T,
): Map<string, number> {
  return new Map(rows.map((r) => [String(r[key]), r._count._all]));
}

/** Bucket won deals into the last `months` calendar months. */
export function buildMonthlySeries(
  deals: Array<{ value: number; closedAt: Date | null }>,
  now: Date,
  months: number,
) {
  const buckets: Array<{ key: string; label: string; revenue: number; deals: number }> =
    [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      // en-US keeps every month to three letters ("Sep", not en-GB's "Sept"),
      // which keeps the chart's x-axis labels evenly sized.
      label: date.toLocaleDateString("en-US", { month: "short" }),
      revenue: 0,
      deals: 0,
    });
  }

  const index = new Map(buckets.map((b, i) => [b.key, i]));

  for (const deal of deals) {
    if (!deal.closedAt) continue;
    const key = `${deal.closedAt.getFullYear()}-${String(
      deal.closedAt.getMonth() + 1,
    ).padStart(2, "0")}`;
    const i = index.get(key);
    if (i === undefined) continue;
    buckets[i]!.revenue += deal.value;
    buckets[i]!.deals += 1;
  }

  return buckets;
}
