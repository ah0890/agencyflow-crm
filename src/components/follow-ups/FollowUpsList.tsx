"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, PhoneCall, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowActions } from "@/components/ui/RowActions";
import { FOLLOWUP_TYPES, optionOf } from "@/lib/constants";
import { cn, formatDateTime, isDueToday, isOverdue } from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import {
  FollowUpFormDialog,
  type EditableFollowUp,
} from "./FollowUpFormDialog";

export type FollowUpRow = EditableFollowUp & {
  completed: boolean;
  outcome: string | null;
  owner: { id: string; name: string; avatarColor: string };
  lead: { id: string; name: string; company: string } | null;
  client: { id: string; name: string } | null;
};

/**
 * Follow-ups as a list rather than a table.
 *
 * Each row is a scheduled conversation, so the important things are when it is
 * due and who it is with - a list with a prominent complete button reads better
 * than six columns of cells.
 */
export function FollowUpsList({
  rows,
  leads,
  clients,
  users,
  currentUserId,
}: {
  rows: FollowUpRow[];
  leads: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useQueryParams();
  const { run } = useResourceMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpRow | null>(null);
  const [deleting, setDeleting] = useState<FollowUpRow | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  // Same optimistic treatment as the task checkbox: the tick lands instantly
  // and the refreshed rows replace it.
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

  async function complete(followUp: FollowUpRow) {
    setCompleting(followUp.id);
    setOptimisticDone((c) => ({ ...c, [followUp.id]: true }));
    const result = await run({
      path: `/api/follow-ups/${followUp.id}/complete`,
      method: "POST",
      successMessage: "Follow-up completed",
    });
    if (!result) {
      setOptimisticDone((c) => {
        const next = { ...c };
        delete next[followUp.id];
        return next;
      });
    }
    setCompleting(null);
  }

  async function reopen(followUp: FollowUpRow) {
    setCompleting(followUp.id);
    setOptimisticDone((c) => ({ ...c, [followUp.id]: false }));
    await run({
      path: `/api/follow-ups/${followUp.id}`,
      method: "PATCH",
      body: { completed: false },
      successMessage: "Follow-up reopened",
    });
    setCompleting(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    await run({
      path: `/api/follow-ups/${deleting.id}`,
      method: "DELETE",
      successMessage: "Follow-up deleted",
    });
    setDeleting(null);
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          icon={<PhoneCall className="size-5" />}
          title="Nothing scheduled here"
          description="Book the next conversation so nothing slips through."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Schedule a follow-up
            </Button>
          }
        />
      ) : (
        <ul>
          {rows.map((followUp) => {
            const type = optionOf(FOLLOWUP_TYPES, followUp.type);
            const done = optimisticDone[followUp.id] ?? followUp.completed;
            const late = !done && isOverdue(followUp.dueAt);
            const today = !done && isDueToday(followUp.dueAt);

            return (
              <li
                key={followUp.id}
                className="flex flex-wrap items-start gap-3 border-b border-[var(--border)] px-5 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]"
              >
                <button
                  type="button"
                  disabled={completing === followUp.id}
                  onClick={() => (done ? reopen(followUp) : complete(followUp))}
                  aria-label={
                    done
                      ? `Reopen ${followUp.title}`
                      : `Mark ${followUp.title} complete`
                  }
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
                    done
                      ? "border-[var(--success)] bg-[var(--success)] text-white"
                      : "border-[var(--border-strong)] text-transparent hover:border-[var(--success)] hover:text-[var(--success)]",
                  )}
                >
                  <Check className="size-3" />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done
                        ? "text-[var(--text-subtle)] line-through"
                        : "text-[var(--text)]",
                    )}
                  >
                    {followUp.title}
                  </p>

                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-subtle)]">
                    <Badge tone={type.tone}>{type.label}</Badge>
                    {followUp.lead ? (
                      <Link
                        href={`/leads/${followUp.lead.id}`}
                        className="hover:text-[var(--accent-text)]"
                      >
                        {followUp.lead.company}
                      </Link>
                    ) : null}
                    {followUp.client ? (
                      <Link
                        href={`/clients/${followUp.client.id}`}
                        className="hover:text-[var(--accent-text)]"
                      >
                        {followUp.client.name}
                      </Link>
                    ) : null}
                  </p>

                  {followUp.notes ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {followUp.notes}
                    </p>
                  ) : null}

                  {done && followUp.outcome ? (
                    <p className="mt-1.5 text-xs text-[var(--success-text)]">
                      Outcome: {followUp.outcome}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-xs",
                        late
                          ? "font-medium text-[var(--danger-text)]"
                          : today
                            ? "font-medium text-[var(--warning-text)]"
                            : "text-[var(--text-muted)]",
                      )}
                    >
                      {formatDateTime(followUp.dueAt)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-subtle)]">
                      {late ? "Overdue" : today ? "Due today" : ""}
                    </p>
                  </div>

                  <Avatar
                    name={followUp.owner.name}
                    color={followUp.owner.avatarColor}
                    size="xs"
                  />

                  <RowActions
                    label={`Actions for ${followUp.title}`}
                    actions={[
                      {
                        label: "Edit",
                        icon: <Pencil className="size-3.5" />,
                        onSelect: () => {
                          setEditing(followUp);
                          setFormOpen(true);
                        },
                      },
                      {
                        label: "Delete",
                        icon: <Trash2 className="size-3.5" />,
                        destructive: true,
                        onSelect: () => setDeleting(followUp),
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FollowUpFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        followUp={quickAdd ? null : editing}
        leads={leads}
        clients={clients}
        users={users}
        defaultOwnerId={currentUserId}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this follow-up?"
        message={
          <>
            <strong className="text-[var(--text)]">{deleting?.title}</strong>{" "}
            will be removed from the schedule. This cannot be undone.
          </>
        }
        confirmLabel="Delete follow-up"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** Page header button. */
export function NewFollowUpButton({
  leads,
  clients,
  users,
  currentUserId,
  defaultLeadId,
  defaultClientId,
  label = "Schedule follow-up",
}: {
  leads: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
  defaultLeadId?: string;
  defaultClientId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <FollowUpFormDialog
        open={open}
        onClose={() => setOpen(false)}
        leads={leads}
        clients={clients}
        users={users}
        defaultOwnerId={currentUserId}
        defaultLeadId={defaultLeadId}
        defaultClientId={defaultClientId}
      />
    </>
  );
}
