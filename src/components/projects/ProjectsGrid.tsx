"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RowActions } from "@/components/ui/RowActions";
import {
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  optionOf,
} from "@/lib/constants";
import { cn, formatCurrency, formatDate, isOverdue } from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import {
  ProjectFormDialog,
  type EditableProject,
} from "./ProjectFormDialog";

export type ProjectCard = Omit<EditableProject, "memberIds"> & {
  client: { id: string; name: string };
  manager: { id: string; name: string; avatarColor: string };
  members: Array<{ userId: string }>;
  _count: { tasks: number; members: number };
};

/**
 * Projects as cards rather than rows.
 *
 * A project's most important attributes are progress and deadline, both of
 * which read far better as a bar and a date on a card than as table cells.
 */
export function ProjectsGrid({
  projects,
  clients,
  users,
  currentUserId,
  currency,
}: {
  projects: ProjectCard[];
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
  currency: string;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useQueryParams();
  const { run } = useResourceMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableProject | null>(null);
  const [deleting, setDeleting] = useState<ProjectCard | null>(null);

  // The top-bar quick-add links here with ?new=1. Reading it directly keeps the
  // URL as the single source of truth - no effect copying it into state.
  const quickAdd = searchParams.get("new") === "1";
  const dialogOpen = formOpen || quickAdd;

  function closeDialog() {
    setFormOpen(false);
    setEditing(null);
    if (quickAdd) setParams({ new: null });
  }

  async function confirmDelete() {
    if (!deleting) return;
    await run({
      path: `/api/projects/${deleting.id}`,
      method: "DELETE",
      successMessage: "Project deleted",
    });
    setDeleting(null);
  }

  if (projects.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Briefcase className="size-5" />}
          title="No projects match this view"
          description="Clear the filters, or start a project for one of your clients."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New project
            </Button>
          }
        />
        <ProjectFormDialog
          open={dialogOpen}
          onClose={closeDialog}
          clients={clients}
          users={users}
          defaultManagerId={currentUserId}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const status = optionOf(PROJECT_STATUSES, project.status);
          const priority = optionOf(PRIORITIES, project.priority);
          const type = optionOf(PROJECT_TYPES, project.type);
          const late =
            project.deadline &&
            project.status !== "COMPLETED" &&
            project.status !== "CANCELLED" &&
            isOverdue(project.deadline);

          return (
            <article
              key={project.id}
              className="flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/projects/${project.id}`} className="group">
                    <h3 className="truncate text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent-text)]">
                      {project.name}
                    </h3>
                  </Link>
                  <Link
                    href={`/clients/${project.client.id}`}
                    className="block truncate text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                  >
                    {project.client.name}
                  </Link>
                </div>

                <RowActions
                  label={`Actions for ${project.name}`}
                  actions={[
                    {
                      label: "Edit",
                      icon: <Pencil className="size-3.5" />,
                      onSelect: () => {
                        setEditing({
                          ...project,
                          memberIds: project.members.map((m) => m.userId),
                        });
                        setFormOpen(true);
                      },
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 className="size-3.5" />,
                      destructive: true,
                      onSelect: () => setDeleting(project),
                    },
                  ]}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={status.tone} dot>
                  {status.label}
                </Badge>
                <Badge tone={priority.tone}>{priority.label}</Badge>
                <Badge tone="neutral">{type.label}</Badge>
              </div>

              <div className="mt-4">
                <ProgressBar value={project.progress} showLabel />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-xs">
                <div>
                  <dt className="text-[var(--text-subtle)]">Budget</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-[var(--text)]">
                    {formatCurrency(project.budget, {
                      currency,
                      compact: true,
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-subtle)]">Deadline</dt>
                  <dd
                    className={cn(
                      "mt-0.5 font-medium",
                      late
                        ? "text-[var(--danger-text)]"
                        : "text-[var(--text)]",
                    )}
                  >
                    {formatDate(project.deadline)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-[var(--text-subtle)]">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar
                    name={project.manager.name}
                    color={project.manager.avatarColor}
                    size="xs"
                  />
                  <span className="truncate">{project.manager.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="size-3" />
                    {project._count.tasks}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(project.startDate)}
                  </span>
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        project={quickAdd ? null : editing}
        clients={clients}
        users={users}
        defaultManagerId={currentUserId}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this project?"
        message={
          <>
            <strong className="text-[var(--text)]">{deleting?.name}</strong> and
            its {deleting?._count.tasks ?? 0} task(s) will be removed. This
            cannot be undone.
          </>
        }
        confirmLabel="Delete project"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** Page header button. */
export function NewProjectButton({
  clients,
  users,
  currentUserId,
}: {
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>New project</Button>
      <ProjectFormDialog
        open={open}
        onClose={() => setOpen(false)}
        clients={clients}
        users={users}
        defaultManagerId={currentUserId}
      />
    </>
  );
}
