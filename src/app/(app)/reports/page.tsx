import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Percent,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import { getReportData } from "@/server/services/reports";
import { getServerPreferences } from "@/lib/preferences.server";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatTile } from "@/components/dashboard/StatTile";
import { TableWrap, Td, Th, Tr } from "@/components/ui/DataTable";
import { BarList } from "@/components/charts/BarList";
import { TrendChart } from "@/components/charts/TrendChart";
import { StageValueChart } from "@/components/charts/StageValueChart";

export const metadata: Metadata = { title: "Reports" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RANGES = [3, 6, 12];

/**
 * Business analytics.
 *
 * Everything here is computed from the operational tables at request time - no
 * warehouse, no nightly job, no summary rows to drift out of date. The time
 * range is a URL parameter so a particular report is a shareable link.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.months) ? params.months[0] : params.months;
  const months = RANGES.includes(Number(raw)) ? Number(raw) : 6;

  const [data, preferences] = await Promise.all([
    getReportData(months),
    getServerPreferences(),
  ]);

  const currency = preferences.currency;
  const money = (value: number, compact = true) =>
    formatCurrency(value, { currency, compact });

  const { summary, charts, teamPerformance } = data;

  return (
    <>
      <PageHeader
        title="Reports"
        description="How the agency is converting, delivering and earning"
        actions={
          <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={`/reports?months=${range}`}
                aria-current={range === months ? "page" : undefined}
                className={cn(
                  "h-9 border-l border-[var(--border)] px-3 text-sm leading-9 transition-colors first:border-l-0",
                  range === months
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
                )}
              >
                {range}m
              </Link>
            ))}
          </div>
        }
      />

      {/* ------------------------------ headline ----------------------------- */}
      <section aria-label="Headline metrics">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="Revenue won"
            value={money(summary.wonValue)}
            hint={`${summary.wonCount} deals closed`}
            icon={Wallet}
            tone="success"
          />
          <StatTile
            label="Open pipeline"
            value={money(summary.openValue)}
            hint="Not yet won or lost"
            icon={TrendingUp}
            tone="accent"
          />
          <StatTile
            label="Win rate"
            value={formatPercent(summary.winRate)}
            hint={`${summary.wonCount} won / ${summary.lostCount} lost`}
            icon={Trophy}
            tone="violet"
          />
          <StatTile
            label="Lead conversion"
            value={formatPercent(summary.leadConversionRate)}
            hint={`${summary.convertedLeads} of ${summary.totalLeads} leads`}
            icon={Target}
            tone="info"
          />
          <StatTile
            label="Task completion"
            value={formatPercent(summary.taskCompletionRate)}
            hint={`${summary.completedTasks} of ${summary.totalTasks} done`}
            icon={CheckCircle2}
            tone="warning"
          />
          <StatTile
            label="Average deal"
            value={money(summary.averageDealSize)}
            hint="Across all won deals"
            icon={Percent}
            tone="neutral"
          />
        </div>
      </section>

      {/* ------------------------------- charts ------------------------------ */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue trend"
            description={`Closed-won revenue over the last ${months} months`}
          />
          <CardBody>
            <TrendChart
              data={charts.revenueTrend}
              currency={currency}
              height={280}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Lead sources"
            description="Which channels produce leads"
          />
          <CardBody>
            <BarList
              items={charts.leadsBySource.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
                meta: money(row.value),
              }))}
              emptyMessage="No leads recorded yet."
            />
          </CardBody>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Value by pipeline stage"
            description="Where deal value is concentrated"
          />
          <CardBody>
            <StageValueChart
              data={charts.dealsByStage.filter((row) => row.key !== "LOST")}
              currency={currency}
              height={280}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Project types"
            description="What the agency actually sells"
          />
          <CardBody>
            <BarList
              items={charts.projectsByType.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
                meta: money(row.value),
              }))}
              emptyMessage="No projects yet."
            />
          </CardBody>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Leads by status" />
          <CardBody>
            <BarList
              items={charts.leadsByStatus.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Projects by status" />
          <CardBody>
            <BarList
              items={charts.projectsByStatus.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tasks by status" />
          <CardBody>
            <BarList
              items={charts.tasksByStatus.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
              }))}
            />
          </CardBody>
        </Card>
      </section>

      {/* --------------------------- team performance ------------------------ */}
      <section className="mt-4">
        <Card>
          <CardHeader
            title="Team performance"
            description="Revenue closed, pipeline owned and delivery output per person"
          />
          <TableWrap>
            <thead>
              <tr>
                <Th>Team member</Th>
                <Th align="right">Revenue won</Th>
                <Th align="right">Deals won</Th>
                <Th align="right">Open pipeline</Th>
                <Th align="right">Leads owned</Th>
                <Th align="right">Tasks completed</Th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance.map((member) => (
                <Tr key={member.id}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <Avatar
                        name={member.name}
                        color={member.avatarColor}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-[var(--text)]">
                          {member.name}
                        </span>
                        <span className="block truncate text-xs text-[var(--text-subtle)]">
                          {member.jobTitle ?? ""}
                        </span>
                      </span>
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                      {money(member.wonValue)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {formatNumber(member.wonCount)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {money(member.openValue)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {formatNumber(member.leadCount)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {formatNumber(member.tasksCompleted)}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      </section>

      {/* ------------------------------ delivery ----------------------------- */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Projects completed"
          value={`${summary.completedProjects}/${summary.totalProjects}`}
          hint={`${formatPercent(summary.projectCompletionRate)} completion rate`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="Overdue tasks"
          value={formatNumber(summary.overdueTasks)}
          hint={summary.overdueTasks > 0 ? "Needs attention" : "All on track"}
          alert={summary.overdueTasks > 0}
          icon={Target}
          tone="danger"
          href="/tasks?scope=overdue"
        />
        <StatTile
          label="New leads in range"
          value={formatNumber(summary.newLeadsInRange)}
          hint={`Last ${months} months`}
          icon={TrendingUp}
          tone="info"
          href="/leads"
        />
        <StatTile
          label="Deals lost"
          value={formatNumber(summary.lostCount)}
          hint="Closed without a win"
          icon={Trophy}
          tone="neutral"
          href="/deals?view=list&stage=LOST"
        />
      </section>
    </>
  );
}
