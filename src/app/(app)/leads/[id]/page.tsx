import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone } from "lucide-react";
import { getLead } from "@/server/services/leads";
import { getUserOptions } from "@/server/services/users";
import { getActivityFor } from "@/server/services/activity";
import { getServerPreferences } from "@/lib/preferences.server";
import { NotFoundError } from "@/server/http";
import {
  DEAL_STAGES,
  FOLLOWUP_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  optionOf,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  isOverdue,
} from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  DetailHeader,
  InfoRow,
  MiniStat,
} from "@/components/ui/DetailShell";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { LeadDetailActions } from "@/components/leads/LeadDetailActions";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lead;
  try {
    lead = await getLead(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [users, activities, preferences] = await Promise.all([
    getUserOptions(),
    getActivityFor("leadId", id),
    getServerPreferences(),
  ]);

  const currency = preferences.currency;
  const status = optionOf(LEAD_STATUSES, lead.status);
  const source = optionOf(LEAD_SOURCES, lead.source);
  const followUpLate = lead.nextFollowUpAt && isOverdue(lead.nextFollowUpAt);
  const openFollowUps = lead.followUps.filter((f) => !f.completed);

  return (
    <>
      <DetailHeader
        backHref="/leads"
        backLabel="Back to leads"
        title={lead.name}
        subtitle={
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            {lead.company}
            {lead.industry ? ` · ${lead.industry}` : ""}
          </span>
        }
        badges={
          <>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Badge tone={source.tone}>{source.label}</Badge>
            {lead.convertedClient ? (
              <Badge tone="success">
                Converted to {lead.convertedClient.name}
              </Badge>
            ) : null}
          </>
        }
        actions={
          <LeadDetailActions
            lead={lead}
            users={users}
            converted={Boolean(lead.convertedClientId)}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Expected value"
          value={formatCurrency(lead.estimatedValue, { currency })}
        />
        <MiniStat
          label="Lead score"
          value={`${lead.score}/100`}
          tone={lead.score >= 75 ? "success" : "default"}
        />
        <MiniStat label="Open deals" value={String(lead.deals.length)} />
        <MiniStat
          label="Next follow-up"
          value={formatDate(lead.nextFollowUpAt)}
          tone={followUpLate ? "warning" : "default"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Contact details" />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Email">
                  <a
                    href={`mailto:${lead.email}`}
                    className="inline-flex items-center gap-1.5 text-[var(--accent-text)] hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {lead.email}
                  </a>
                </InfoRow>
                <InfoRow label="Phone">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 text-[var(--accent-text)] hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-[var(--text-subtle)]">Not set</span>
                  )}
                </InfoRow>
                <InfoRow label="Owner">
                  <span className="flex items-center gap-2">
                    <Avatar
                      name={lead.owner.name}
                      color={lead.owner.avatarColor}
                      size="xs"
                    />
                    {lead.owner.name}
                  </span>
                </InfoRow>
                <InfoRow label="Added">{formatDate(lead.createdAt)}</InfoRow>
              </dl>

              {lead.notes ? (
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-xs text-[var(--text-subtle)]">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                    {lead.notes}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Deals"
              description="Opportunities linked to this lead"
            />
            <CardBody className="p-0">
              {lead.deals.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                  No deals yet. Convert the lead or add a deal from the
                  pipeline.
                </p>
              ) : (
                <ul>
                  {lead.deals.map((deal) => {
                    const stage = optionOf(DEAL_STAGES, deal.stage);
                    return (
                      <li
                        key={deal.id}
                        className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--text)]">
                            {deal.title}
                          </p>
                          <p className="text-xs text-[var(--text-subtle)]">
                            Expected {formatDate(deal.expectedCloseDate)}
                          </p>
                        </div>
                        <Badge tone={stage.tone} dot>
                          {stage.label}
                        </Badge>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--text)]">
                          {formatCurrency(deal.value, {
                            currency,
                            compact: true,
                          })}
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
              title="Follow-ups"
              description={`${openFollowUps.length} still open`}
              action={
                <Link
                  href="/follow-ups"
                  className="text-xs text-[var(--accent-text)] hover:underline"
                >
                  Manage
                </Link>
              }
            />
            <CardBody className="p-0">
              {lead.followUps.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                  Nothing scheduled with this lead yet.
                </p>
              ) : (
                <ul>
                  {lead.followUps.map((followUp) => {
                    const type = optionOf(FOLLOWUP_TYPES, followUp.type);
                    const late =
                      !followUp.completed && isOverdue(followUp.dueAt);
                    return (
                      <li
                        key={followUp.id}
                        className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                      >
                        <Badge tone={type.tone}>{type.label}</Badge>
                        <span
                          className={
                            followUp.completed
                              ? "min-w-0 flex-1 truncate text-sm text-[var(--text-subtle)] line-through"
                              : "min-w-0 flex-1 truncate text-sm text-[var(--text)]"
                          }
                        >
                          {followUp.title}
                        </span>
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
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Activity"
            description="Everything that happened to this lead"
          />
          <CardBody>
            <ActivityTimeline
              activities={activities}
              emptyMessage="No activity recorded for this lead yet."
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
