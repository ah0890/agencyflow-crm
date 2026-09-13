import { prisma } from "@/lib/db";
import {
  CLIENT_STATUSES,
  DEAL_STAGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  OPEN_DEAL_STAGES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
} from "@/lib/constants";
import { safeRate } from "@/lib/utils";
import { buildMonthlySeries } from "./dashboard";
import { getTeamPerformance } from "./users";

/**
 * Analytics for the Reports page.
 *
 * Reports read the same tables as everything else and compute on the fly.
 * `months` is caller-controlled so the page can offer a 3 / 6 / 12 month range
 * without a second implementation.
 */

export type ReportData = Awaited<ReturnType<typeof getReportData>>;

export async function getReportData(months = 6) {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [
    leadsByStatus,
    leadsBySource,
    dealsByStage,
    projectsByStatus,
    projectsByType,
    clientsByStatus,
    tasksByStatus,
    wonDeals,
    lostDeals,
    allLeads,
    convertedLeads,
    newLeadsInRange,
    totalTasks,
    completedTasks,
    overdueTasks,
    completedProjects,
    totalProjects,
    onTimeProjects,
    teamPerformance,
  ] = await Promise.all([
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
    prisma.project.groupBy({
      by: ["type"],
      _count: { _all: true },
      _sum: { budget: true },
    }),
    prisma.client.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.deal.findMany({
      where: { stage: "WON", closedAt: { gte: since } },
      select: { value: true, closedAt: true },
    }),
    prisma.deal.count({ where: { stage: "LOST" } }),
    prisma.lead.count(),
    // "Converted" means the lead reached Won - the same definition the
    // dashboard and the funnel use, so the three screens never disagree.
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "COMPLETED" } }),
    prisma.task.count({
      where: { status: { not: "COMPLETED" }, dueDate: { lt: now } },
    }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.project.count(),
    prisma.project.count({
      where: {
        status: "COMPLETED",
        // Prisma cannot compare two columns directly, so "on time" is
        // approximated as completed with a deadline that had not yet passed.
        completedAt: { not: null },
        deadline: { gte: now },
      },
    }),
    getTeamPerformance(),
  ]);

  const stageMap = new Map(
    dealsByStage.map((r) => [
      r.stage,
      { count: r._count._all, value: r._sum.value ?? 0 },
    ]),
  );

  const wonCount = stageMap.get("WON")?.count ?? 0;
  const wonValue = stageMap.get("WON")?.value ?? 0;
  const decided = wonCount + lostDeals;

  const openValue = OPEN_DEAL_STAGES.reduce(
    (sum, stage) => sum + (stageMap.get(stage)?.value ?? 0),
    0,
  );

  const summary = {
    totalLeads: allLeads,
    newLeadsInRange,
    convertedLeads,
    leadConversionRate: safeRate(convertedLeads, allLeads),
    wonCount,
    lostCount: lostDeals,
    winRate: safeRate(wonCount, decided),
    wonValue,
    openValue,
    averageDealSize: wonCount ? wonValue / wonCount : 0,
    taskCompletionRate: safeRate(completedTasks, totalTasks),
    totalTasks,
    completedTasks,
    overdueTasks,
    projectCompletionRate: safeRate(completedProjects, totalProjects),
    completedProjects,
    totalProjects,
    onTimeProjects,
  };

  return {
    months,
    summary,
    teamPerformance,
    charts: {
      revenueTrend: buildMonthlySeries(wonDeals, now, months),
      leadsByStatus: toSeries(leadsByStatus, "status", LEAD_STATUSES),
      leadsBySource: LEAD_SOURCES.map((source) => {
        const row = leadsBySource.find((r) => r.source === source.value);
        return {
          key: source.value,
          label: source.label,
          tone: source.tone,
          count: row?._count._all ?? 0,
          value: row?._sum.estimatedValue ?? 0,
        };
      })
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count),
      dealsByStage: DEAL_STAGES.map((stage) => ({
        key: stage.value,
        label: stage.label,
        tone: stage.tone,
        count: stageMap.get(stage.value)?.count ?? 0,
        value: stageMap.get(stage.value)?.value ?? 0,
      })),
      projectsByStatus: toSeries(projectsByStatus, "status", PROJECT_STATUSES),
      projectsByType: PROJECT_TYPES.map((type) => {
        const row = projectsByType.find((r) => r.type === type.value);
        return {
          key: type.value,
          label: type.label,
          tone: type.tone,
          count: row?._count._all ?? 0,
          value: row?._sum.budget ?? 0,
        };
      }).filter((r) => r.count > 0),
      clientsByStatus: toSeries(clientsByStatus, "status", CLIENT_STATUSES),
      tasksByStatus: toSeries(tasksByStatus, "status", TASK_STATUSES),
    },
  };
}

/** Turn a Prisma groupBy result into a labelled, ordered chart series. */
function toSeries(
  rows: Array<Record<string, unknown> & { _count: { _all: number } }>,
  key: string,
  options: ReadonlyArray<{ value: string; label: string; tone: string }>,
) {
  const counts = new Map(rows.map((r) => [String(r[key]), r._count._all]));
  return options
    .map((option) => ({
      key: option.value,
      label: option.label,
      tone: option.tone,
      count: counts.get(option.value) ?? 0,
    }))
    .filter((row) => row.count > 0);
}
