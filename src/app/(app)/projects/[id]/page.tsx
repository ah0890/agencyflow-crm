import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/server/services/projects";
import { getProjectOptions } from "@/server/services/projects";
import { getUserOptions } from "@/server/services/users";
import { getClientOptions } from "@/server/services/clients";
import { getActivityFor } from "@/server/services/activity";
import { getServerPreferences } from "@/lib/preferences.server";
import { NotFoundError } from "@/server/http";
import {
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
  optionOf,
} from "@/lib/constants";
import { formatCurrency, formatDate, safeRate } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DetailHeader, InfoRow, MiniStat } from "@/components/ui/DetailShell";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { ProjectDetailActions } from "@/components/projects/ProjectDetailActions";
import { TasksTable, NewTaskButton } from "@/components/tasks/TasksTable";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [activities, users, clients, projectOptions, preferences] =
    await Promise.all([
      getActivityFor("projectId", id),
      getUserOptions(),
      getClientOptions(),
      getProjectOptions(),
      getServerPreferences(),
    ]);

  const currency = preferences.currency;
  const status = optionOf(PROJECT_STATUSES, project.status);
  const priority = optionOf(PRIORITIES, project.priority);
  const type = optionOf(PROJECT_TYPES, project.type);

  const completedTasks = project.tasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;

  return (
    <>
      <DetailHeader
        backHref="/projects"
        backLabel="Back to projects"
        title={project.name}
        subtitle={
          <Link
            href={`/clients/${project.client.id}`}
            className="hover:text-[var(--accent-text)]"
          >
            {project.client.name}
          </Link>
        }
        badges={
          <>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Badge tone={priority.tone}>{priority.label} priority</Badge>
            <Badge tone="neutral">{type.label}</Badge>
          </>
        }
        actions={
          <ProjectDetailActions
            project={{
              ...project,
              memberIds: project.members.map((m) => m.userId),
            }}
            clients={clients}
            users={users}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Budget"
          value={formatCurrency(project.budget, { currency })}
        />
        <MiniStat
          label="Tasks complete"
          value={`${completedTasks}/${project.tasks.length}`}
          tone={
            project.tasks.length > 0 && completedTasks === project.tasks.length
              ? "success"
              : "default"
          }
        />
        <MiniStat label="Start date" value={formatDate(project.startDate)} />
        <MiniStat
          label="Deadline"
          value={formatDate(project.deadline)}
          tone={
            project.deadline &&
            project.status !== "COMPLETED" &&
            new Date(project.deadline) < new Date()
              ? "warning"
              : "default"
          }
        />
      </div>

      <Card className="mt-4">
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--text)]">Progress</p>
            <p className="text-xs text-[var(--text-muted)]">
              {project.tasks.length > 0
                ? `${Math.round(safeRate(completedTasks, project.tasks.length))}% of tasks done`
                : "No tasks yet"}
            </p>
          </div>
          <ProgressBar className="mt-3" value={project.progress} showLabel />
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Tasks"
              description="Tick one off and the progress bar above updates"
              action={
                <NewTaskButton
                  projects={projectOptions}
                  users={users}
                  defaultProjectId={project.id}
                  label="Add task"
                />
              }
            />
            <TasksTable
              rows={project.tasks.map((task) => ({
                ...task,
                project: { id: project.id, name: project.name },
              }))}
              projects={projectOptions}
              users={users}
            />
          </Card>

          <Card>
            <CardHeader title="Project details" />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Project manager">
                  <span className="flex items-center gap-2">
                    <Avatar
                      name={project.manager.name}
                      color={project.manager.avatarColor}
                      size="xs"
                    />
                    {project.manager.name}
                  </span>
                </InfoRow>
                <InfoRow label="Client contact">
                  {project.client.contactName}
                </InfoRow>
                <InfoRow label="Created">
                  {formatDate(project.createdAt)}
                </InfoRow>
                <InfoRow label="Completed">
                  {project.completedAt
                    ? formatDate(project.completedAt)
                    : "Not yet"}
                </InfoRow>
              </dl>

              {project.description ? (
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-xs text-[var(--text-subtle)]">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                    {project.description}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Team"
              description={`${project.members.length + 1} people on this project`}
            />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={project.manager.name}
                  color={project.manager.avatarColor}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--text)]">
                    {project.manager.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-subtle)]">
                    Project manager
                  </p>
                </div>
              </div>

              {project.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar
                    name={member.user.name}
                    color={member.user.avatarColor}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--text)]">
                      {member.user.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-subtle)]">
                      {member.user.jobTitle ?? "Contributor"}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Task breakdown" />
            <CardBody className="space-y-2">
              {TASK_STATUSES.map((taskStatus) => {
                const count = project.tasks.filter(
                  (t) => t.status === taskStatus.value,
                ).length;
                return (
                  <div
                    key={taskStatus.value}
                    className="flex items-center justify-between gap-2"
                  >
                    <Badge tone={taskStatus.tone} dot>
                      {taskStatus.label}
                    </Badge>
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <CardBody>
              <ActivityTimeline
                activities={activities}
                emptyMessage="No activity recorded for this project yet."
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
