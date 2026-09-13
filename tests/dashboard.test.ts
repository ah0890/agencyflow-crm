import { describe, expect, it } from "vitest";
import {
  buildMonthlySeries,
  getDashboardData,
} from "@/server/services/dashboard";
import { createLead } from "@/server/services/leads";
import { createDeal, moveDeal } from "@/server/services/deals";
import { createProject } from "@/server/services/projects";
import { createTask, toggleTask } from "@/server/services/tasks";
import { createFollowUp } from "@/server/services/follow-ups";
import { createClient } from "@/server/services/clients";
import { makeUser } from "./factories";
import { safeRate } from "@/lib/utils";

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

describe("dashboard calculations", () => {
  it("computes every KPI from the underlying records", async () => {
    const user = await makeUser();

    // 3 leads, one of them won.
    await createLead(
      { name: "A", company: "Alpha", email: "a@alpha.test", source: "WEBSITE", ownerId: user.id },
      user.id,
    );
    await createLead(
      { name: "B", company: "Beta", email: "b@beta.test", source: "REFERRAL", ownerId: user.id },
      user.id,
    );
    await createLead(
      {
        name: "C",
        company: "Gamma",
        email: "c@gamma.test",
        source: "WEBSITE",
        status: "WON",
        ownerId: user.id,
      },
      user.id,
    );

    // 2 clients, one active one churned.
    const active = await createClient(
      {
        name: "Active Co",
        contactName: "Contact",
        email: "active@co.test",
        status: "ACTIVE",
        accountManagerId: user.id,
      },
      user.id,
    );
    await createClient(
      {
        name: "Churned Co",
        contactName: "Contact",
        email: "churn@co.test",
        status: "CHURNED",
        accountManagerId: user.id,
      },
      user.id,
    );

    // Deals: 30k open, 50k won, 1 lost.
    await createDeal(
      { title: "Open A", company: "Alpha", contactName: "A", value: 10000, stage: "QUALIFIED", ownerId: user.id },
      user.id,
    );
    await createDeal(
      { title: "Open B", company: "Beta", contactName: "B", value: 20000, stage: "PROPOSAL", ownerId: user.id },
      user.id,
    );
    const won = await createDeal(
      { title: "Won", company: "Gamma", contactName: "C", value: 50000, ownerId: user.id },
      user.id,
    );
    const lost = await createDeal(
      { title: "Lost", company: "Delta", contactName: "D", value: 9000, ownerId: user.id },
      user.id,
    );
    await moveDeal(won.id, { stage: "WON" }, user.id);
    await moveDeal(lost.id, { stage: "LOST" }, user.id);

    // Projects: one active, one completed.
    const project = await createProject(
      {
        name: "Active project",
        clientId: active.id,
        status: "IN_PROGRESS",
        startDate: "2026-01-01",
        managerId: user.id,
      },
      user.id,
    );
    await createProject(
      {
        name: "Done project",
        clientId: active.id,
        status: "COMPLETED",
        startDate: "2026-01-01",
        managerId: user.id,
      },
      user.id,
    );

    // Tasks: 2 open (one overdue), 1 done.
    await createTask(
      { title: "Overdue", projectId: project.id, assigneeId: user.id, dueDate: inDays(-2) },
      user.id,
    );
    await createTask(
      { title: "Upcoming", projectId: project.id, assigneeId: user.id, dueDate: inDays(3) },
      user.id,
    );
    const doneTask = await createTask(
      { title: "Done", projectId: project.id, assigneeId: user.id },
      user.id,
    );
    await toggleTask(doneTask.id, user.id);

    // Follow-ups: one due this week, one already overdue.
    await createFollowUp(
      { title: "Soon", dueAt: inDays(2), ownerId: user.id, clientId: active.id },
      user.id,
    );
    await createFollowUp(
      { title: "Late", dueAt: inDays(-1), ownerId: user.id, clientId: active.id },
      user.id,
    );

    const { kpis, charts } = await getDashboardData();

    expect(kpis.totalLeads).toBe(3);
    expect(kpis.newLeads).toBe(3); // all created just now
    expect(kpis.activeClients).toBe(1); // churned excluded
    expect(kpis.activeProjects).toBe(1); // completed excluded

    expect(kpis.pipelineValue).toBe(30000);
    expect(kpis.openDealCount).toBe(2);
    expect(kpis.wonValue).toBe(50000);
    expect(kpis.wonDealCount).toBe(1);

    // One win, one loss.
    expect(kpis.winRate).toBe(50);
    // One of three leads is marked won.
    expect(kpis.leadConversionRate).toBeCloseTo(safeRate(1, 3), 5);
    expect(kpis.averageDealSize).toBe(50000);

    expect(kpis.pendingTasks).toBe(2);
    expect(kpis.overdueTasks).toBe(1);
    expect(kpis.upcomingFollowUps).toBe(1);
    expect(kpis.overdueFollowUps).toBe(1);

    // Weighted pipeline: 10k at 40% + 20k at 60% = 16k.
    expect(kpis.weightedPipeline).toBeCloseTo(16000, 5);

    // Funnel keeps every stage, in order, including empty ones.
    expect(charts.funnel.map((s) => s.key)).toEqual([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL_SENT",
      "NEGOTIATION",
      "WON",
    ]);
    expect(charts.funnel.find((s) => s.key === "NEW")?.count).toBe(2);
    expect(charts.funnel.find((s) => s.key === "WON")?.count).toBe(1);

    // Source chart drops zero rows and sorts by count.
    expect(charts.leadsBySource[0]?.key).toBe("WEBSITE");
    expect(charts.leadsBySource[0]?.count).toBe(2);
  });

  it("returns zeros rather than NaN on an empty database", async () => {
    const { kpis, charts } = await getDashboardData();

    expect(kpis.totalLeads).toBe(0);
    expect(kpis.pipelineValue).toBe(0);
    expect(kpis.winRate).toBe(0);
    expect(kpis.leadConversionRate).toBe(0);
    expect(kpis.averageDealSize).toBe(0);
    expect(Number.isNaN(kpis.winRate)).toBe(false);

    expect(charts.leadsBySource).toEqual([]);
    expect(charts.monthlyRevenue).toHaveLength(6);
    expect(charts.monthlyRevenue.every((m) => m.revenue === 0)).toBe(true);
  });
});

describe("monthly series", () => {
  const now = new Date(2026, 8, 15); // 15 Sep 2026

  it("buckets deals into the right calendar months", () => {
    const series = buildMonthlySeries(
      [
        { value: 1000, closedAt: new Date(2026, 8, 2) }, // Sep
        { value: 500, closedAt: new Date(2026, 8, 28) }, // Sep
        { value: 2000, closedAt: new Date(2026, 7, 10) }, // Aug
      ],
      now,
      6,
    );

    expect(series).toHaveLength(6);
    expect(series[5]?.label).toBe("Sep");
    expect(series[5]?.revenue).toBe(1500);
    expect(series[5]?.deals).toBe(2);
    expect(series[4]?.revenue).toBe(2000);
    expect(series[0]?.revenue).toBe(0);
  });

  it("ignores deals outside the window and with no close date", () => {
    const series = buildMonthlySeries(
      [
        { value: 9999, closedAt: new Date(2020, 0, 1) },
        { value: 8888, closedAt: null },
      ],
      now,
      6,
    );

    expect(series.reduce((sum, m) => sum + m.revenue, 0)).toBe(0);
  });
});
