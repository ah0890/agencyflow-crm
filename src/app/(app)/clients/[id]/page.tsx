import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { getClient } from "@/server/services/clients";
import { getUserOptions } from "@/server/services/users";
import { getActivityFor } from "@/server/services/activity";
import { getServerPreferences } from "@/lib/preferences.server";
import { NotFoundError } from "@/server/http";
import {
  CLIENT_STATUSES,
  DEAL_STAGES,
  PROJECT_STATUSES,
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
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DetailHeader, InfoRow, MiniStat } from "@/components/ui/DetailShell";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { ClientDetailActions } from "@/components/clients/ClientDetailActions";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let client;
  try {
    client = await getClient(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [activities, users, preferences] = await Promise.all([
    getActivityFor("clientId", id),
    getUserOptions(),
    getServerPreferences(),
  ]);

  const currency = preferences.currency;
  const status = optionOf(CLIENT_STATUSES, client.status);
  const openDeals = client.deals.filter(
    (d) => d.stage !== "WON" && d.stage !== "LOST",
  );

  return (
    <>
      <DetailHeader
        backHref="/clients"
        backLabel="Back to clients"
        title={client.name}
        subtitle={client.contactName + (client.industry ? ` · ${client.industry}` : "")}
        badges={
          <>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Badge tone="neutral">
              Client since {formatDate(client.createdAt)}
            </Badge>
          </>
        }
        actions={<ClientDetailActions client={client} users={users} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Total revenue"
          value={formatCurrency(client.totalValue, { currency })}
          tone="success"
        />
        <MiniStat
          label="Active projects"
          value={String(client.activeProjects)}
        />
        <MiniStat label="Open deals" value={String(openDeals.length)} />
        <MiniStat
          label="Open follow-ups"
          value={String(client.followUps.length)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Account details" />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Email">
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 text-[var(--accent-text)] hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {client.email}
                  </a>
                </InfoRow>
                <InfoRow label="Phone">
                  {client.phone ? (
                    <a
                      href={`tel:${client.phone}`}
                      className="inline-flex items-center gap-1.5 text-[var(--accent-text)] hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-[var(--text-subtle)]">Not set</span>
                  )}
                </InfoRow>
                <InfoRow label="Website">
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[var(--accent-text)] hover:underline"
                    >
                      <Globe className="size-3.5" />
                      {client.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-[var(--text-subtle)]">Not set</span>
                  )}
                </InfoRow>
                <InfoRow label="Account manager">
                  <span className="flex items-center gap-2">
                    <Avatar
                      name={client.accountManager.name}
                      color={client.accountManager.avatarColor}
                      size="xs"
                    />
                    {client.accountManager.name}
                  </span>
                </InfoRow>
                {client.address ? (
                  <InfoRow label="Address" className="sm:col-span-2">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[var(--text-subtle)]" />
                      {client.address}
                    </span>
                  </InfoRow>
                ) : null}
              </dl>

              {client.notes ? (
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-xs text-[var(--text-subtle)]">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                    {client.notes}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Projects"
              description={`${client.projects.length} in total`}
              action={
                <Link
                  href={`/projects?clientId=${client.id}`}
                  className="text-xs text-[var(--accent-text)] hover:underline"
                >
                  View all
                </Link>
              }
            />
            <CardBody className="p-0">
              {client.projects.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                  No projects yet for this client.
                </p>
              ) : (
                <ul>
                  {client.projects.map((project) => {
                    const projectStatus = optionOf(
                      PROJECT_STATUSES,
                      project.status,
                    );
                    return (
                      <li
                        key={project.id}
                        className="border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/projects/${project.id}`}
                            className="min-w-0 flex-1 truncate text-sm text-[var(--text)] hover:text-[var(--accent-text)]"
                          >
                            {project.name}
                          </Link>
                          <Badge tone={projectStatus.tone} dot>
                            {projectStatus.label}
                          </Badge>
                          <span className="shrink-0 text-sm tabular-nums text-[var(--text-muted)]">
                            {formatCurrency(project.budget, {
                              currency,
                              compact: true,
                            })}
                          </span>
                        </div>
                        <ProgressBar
                          className="mt-2"
                          value={project.progress}
                          showLabel
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Deals" description="Revenue history" />
            <CardBody className="p-0">
              {client.deals.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                  No deals recorded against this client.
                </p>
              ) : (
                <ul>
                  {client.deals.map((deal) => {
                    const stage = optionOf(DEAL_STAGES, deal.stage);
                    return (
                      <li
                        key={deal.id}
                        className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                          {deal.title}
                        </span>
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

          {client.followUps.length > 0 ? (
            <Card>
              <CardHeader
                title="Upcoming follow-ups"
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
                <ul>
                  {client.followUps.map((followUp) => {
                    const late = isOverdue(followUp.dueAt);
                    return (
                      <li
                        key={followUp.id}
                        className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
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
              </CardBody>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Activity"
            description="Everything that happened on this account"
          />
          <CardBody>
            <ActivityTimeline
              activities={activities}
              emptyMessage="No activity recorded for this client yet."
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
