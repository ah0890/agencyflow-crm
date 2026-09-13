"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckSquare, Pencil, Trash2 } from "lucide-react";
import { Td, TableWrap, Th, Tr } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowActions } from "@/components/ui/RowActions";
import { PRIORITIES, TASK_STATUSES, optionOf } from "@/lib/constants";
import { cn, formatDate, isDueToday, isOverdue } from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { TaskFormDialog, type EditableTask } from "./TaskFormDialog";

export type TaskRow = EditableTask & {
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarColor: string } | null;
};

/**
 * Tasks table.
 *
 * The checkbox is the point of this screen: ticking it PATCHes the task, which
 * makes the service recalculate the parent project's progress and write a
 * "Task completed" activity. One click, three things stay in sync.
 */
export function TasksTable({
  rows,
  projects,
  users,
}: {
  rows: TaskRow[];
  projects: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useQueryParams();
  const { run } = useResourceMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Ticking the box flips it immediately rather than waiting for the round
  // trip. Once the server responds the refreshed rows are the truth, so the
  // optimistic entries are dropped whenever new rows arrive.
  const [optimisticDone, setOptimisticDone] = useState<Record<string, boolean>>(
    {},
  );
  const [renderedRows, setRenderedRows] = useState(rows);
  if (rows !== renderedRows) {
    setRenderedRows(rows);
    setOptimisticDone({});
  }

  // The top-bar quick-add links here with ?new=1. Reading it directly keeps the
  // URL as the single source of truth - no effect copying it into state.
  const quickAdd = searchParams.get("new") === "1";
  const dialogOpen = formOpen || quickAdd;

  function closeDialog() {
    setFormOpen(false);
    setEditing(null);
    if (quickAdd) setParams({ new: null });
  }

  async function toggle(task: TaskRow, currentlyDone: boolean) {
    setToggling(task.id);
    setOptimisticDone((current) => ({ ...current, [task.id]: !currentlyDone }));

    const result = await run({
      path: `/api/tasks/${task.id}/toggle`,
      method: "POST",
      successMessage: currentlyDone ? "Task reopened" : "Task completed",
    });

    // Roll the tick back if the server refused.
    if (!result) {
      setOptimisticDone((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
    setToggling(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    await run({
      path: `/api/tasks/${deleting.id}`,
      method: "DELETE",
      successMessage: "Task deleted",
    });
    setDeleting(null);
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="size-5" />}
          title="No tasks match this view"
          description="Clear the filters, or add the next piece of work."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add a task
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th className="w-10">
                <span className="sr-only">Done</span>
              </Th>
              <Th>Task</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Assignee</Th>
              <Th>Due</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => {
              const status = optionOf(TASK_STATUSES, task.status);
              const priority = optionOf(PRIORITIES, task.priority);
              const done =
                optimisticDone[task.id] ?? task.status === "COMPLETED";
              const late = !done && isOverdue(task.dueDate);
              const today = !done && isDueToday(task.dueDate);

              return (
                <Tr key={task.id}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={toggling === task.id}
                      onChange={() => toggle(task, done)}
                      aria-label={
                        done
                          ? `Reopen ${task.title}`
                          : `Mark ${task.title} complete`
                      }
                      className="size-4 cursor-pointer rounded border-[var(--border-strong)] bg-[var(--surface-2)] accent-[var(--accent)] disabled:opacity-50"
                    />
                  </Td>

                  <Td>
                    <span
                      className={cn(
                        "block truncate font-medium",
                        done
                          ? "text-[var(--text-subtle)] line-through"
                          : "text-[var(--text)]",
                      )}
                    >
                      {task.title}
                    </span>
                    {task.project ? (
                      <Link
                        href={`/projects/${task.project.id}`}
                        className="block truncate text-xs text-[var(--text-subtle)] hover:text-[var(--accent-text)]"
                      >
                        {task.project.name}
                      </Link>
                    ) : (
                      <span className="block text-xs text-[var(--text-subtle)]">
                        Internal
                      </span>
                    )}
                  </Td>

                  <Td>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </Td>

                  <Td>
                    <Badge tone={priority.tone}>{priority.label}</Badge>
                  </Td>

                  <Td>
                    {task.assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar
                          name={task.assignee.name}
                          color={task.assignee.avatarColor}
                          size="xs"
                        />
                        <span className="truncate text-xs text-[var(--text-muted)]">
                          {task.assignee.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-subtle)]">
                        Unassigned
                      </span>
                    )}
                  </Td>

                  <Td>
                    <span
                      className={cn(
                        "text-xs",
                        late
                          ? "font-medium text-[var(--danger-text)]"
                          : today
                            ? "font-medium text-[var(--warning-text)]"
                            : "text-[var(--text-muted)]",
                      )}
                    >
                      {formatDate(task.dueDate)}
                      {late ? " (overdue)" : today ? " (today)" : ""}
                    </span>
                  </Td>

                  <Td align="right">
                    <RowActions
                      label={`Actions for ${task.title}`}
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil className="size-3.5" />,
                          onSelect: () => {
                            setEditing(task);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 className="size-3.5" />,
                          destructive: true,
                          onSelect: () => setDeleting(task),
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        task={quickAdd ? null : editing}
        projects={projects}
        users={users}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this task?"
        message={
          <>
            <strong className="text-[var(--text)]">{deleting?.title}</strong>{" "}
            will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete task"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** Page header button. */
export function NewTaskButton({
  projects,
  users,
  defaultProjectId,
  label = "New task",
}: {
  projects: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  defaultProjectId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <TaskFormDialog
        open={open}
        onClose={() => setOpen(false)}
        projects={projects}
        users={users}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
