import type { Metadata } from "next";
import Link from "next/link";
import {
  Briefcase,
  CalendarClock,
  CheckSquare,
  Contact,
  DollarSign,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { getDashboardData } from "@/server/services/dashboard";
import { getServerPreferences } from "@/lib/preferences.server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  isOverdue,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatTile } from "@/components/dashboard/StatTile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { BarList } from "@/components/charts/BarList";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { StageValueChart } from "@/components/charts/StageValueChart";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The dashboard.
 *
 * A server component: one round of parallel queries in getDashboardData(),
 * then finished HTML. Only the two Recharts figures ship JavaScript to the
 * browser, and only because they need hover interaction.
 */
export default async function DashboardPage() {
  const [data, preferences, user] = await Promise.all([
    getDashboardData(),
    getServerPreferences(),
    getCurrentUser(),
  ]);

  const { kpis, charts } = data;
  const currency = preferences.currency;
  const money = (value: number, compact = true) =>
    formatCurrency(value, { currency, compact });

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Here is how the agency is performing right now."
        actions={
          <Link
            href="/reports"
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--border-strong)]"
          >
            <Sparkles className="size-4" />
            Full reports
          </Link>
        }
      />

      {/* ------------------------------- KPIs -------------------------------- */}
      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Total leads"
            value={formatNumber(kpis.totalLeads)}
            hint={`${kpis.newLeads} added in the last 30 days`}
            icon={Contact}
            tone="info"
            href="/leads"
          />
          <StatTile
            label="Active clients"
            value={formatNumber(kpis.activeClients)}
            hint={`${formatPercent(kpis.leadConversionRate)} lead conversion`}
            icon={Users}
            tone="success"
            href="/clients"
          />
          <StatTile
            label="Pipeline value"
            value={money(kpis.pipelineValue)}
            hint={`${kpis.openDealCount} open deals · ${money(kpis.weightedPipeline)} weighted`}
            icon={DollarSign}
            tone="accent"
            href="/deals"
          />
          <StatTile
            label="Won deals"
            value={formatNumber(kpis.wonDealCount)}
            hint={`${money(kpis.wonValue)} · ${formatPercent(kpis.winRate)} win rate`}
            icon={Trophy}
            tone="violet"
            href="/deals?stage=WON"
          />
          <StatTile
            label="Active projects"
            value={formatNumber(kpis.activeProjects)}
            hint="Planning and in progress"
            icon={Briefcase}
            tone="accent"
            href="/projects"
          />
          <StatTile
            label="Pending tasks"
            value={formatNumber(kpis.pendingTasks)}
            hint={
              kpis.overdueTasks > 0
                ? `${kpis.overdueTasks} overdue`
                : "Nothing overdue"
            }
            alert={kpis.overdueTasks > 0}
            icon={CheckSquare}
            tone="warning"
            href="/tasks?scope=open"
          />
          <StatTile
            label="Upcoming follow-ups"
            value={formatNumber(kpis.upcomingFollowUps)}
            hint={
              kpis.overdueFollowUps > 0
                ? `${kpis.overdueFollowUps} overdue`
                : "Next 7 days"
            }
            alert={kpis.overdueFollowUps > 0}
            icon={CalendarClock}
            tone="info"
            href="/follow-ups"
          />
          <StatTile
            label="Average deal size"
            value={money(kpis.averageDealSize)}
            hint="Across all won deals"
            icon={DollarSign}
            tone="neutral"
            href="/reports"
          />
        </div>
      </section>

      {/* ------------------------------ charts ------------------------------- */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Monthly sales performance"
            description="Closed-won revenue over the last six months"
          />
          <CardBody>
            <TrendChart data={charts.monthlyRevenue} currency={currency} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Lead conversion funnel"
            description="How prospects move through the stages"
          />
          <CardBody>
            <FunnelChart stages={charts.funnel} />
          </CardBody>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pipeline by stage"
            description="Deal value sitting in each stage"
          />
          <CardBody>
            <StageValueChart
              data={charts.pipelineByStage}
              currency={currency}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Leads by source"
            description="Where new business comes from"
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

      {/* --------------------------- lists & timeline ------------------------ */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Projects by status"
            description="Delivery workload at a glance"
            action={
              <Link
                href="/projects"
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody>
            <BarList
              items={charts.projectsByStatus.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
              }))}
              emptyMessage="No projects yet."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Next follow-ups"
            description="The touchpoints due soonest"
            action={
              <Link
                href="/follow-ups"
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="p-0">
            {data.nextFollowUps.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                Nothing scheduled. Good time to book one.
              </p>
            ) : (
              <ul>
                {data.nextFollowUps.map((followUp) => {
                  const late = isOverdue(followUp.dueAt);
                  return (
                    <li
                      key={followUp.id}
                      className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                    >
                      <Avatar
                        name={followUp.owner.name}
                        color={followUp.owner.avatarColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--text)]">
                          {followUp.title}
                        </p>
                        <p className="truncate text-xs text-[var(--text-subtle)]">
                          {followUp.lead?.company ??
                            followUp.client?.name ??
                            "Unlinked"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs ${late ? "text-[var(--danger-text)]" : "text-[var(--text-muted)]"}`}
                      >
                        {formatDateTime(followUp.dueAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Biggest open deals"
            description="Where the most value is sitting"
            action={
              <Link
                href="/deals"
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                Pipeline
              </Link>
            }
          />
          <CardBody className="p-0">
            {data.topDeals.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                No open deals right now.
              </p>
            ) : (
              <ul>
                {data.topDeals.map((deal) => (
                  <li
                    key={deal.id}
                    className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--text)]">
                        {deal.company}
                      </p>
                      <p className="truncate text-xs text-[var(--text-subtle)]">
                        {deal.owner.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--text)]">
                      {money(deal.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader
            title="Recent activity"
            description="Everything that happened across the agency"
            action={
              <Badge tone="neutral">{data.recentActivity.length} events</Badge>
            }
          />
          <CardBody>
            <ActivityTimeline activities={data.recentActivity} />
          </CardBody>
        </Card>
      </section>
    </>
  );
}
