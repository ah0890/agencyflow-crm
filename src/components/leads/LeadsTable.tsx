"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Contact, Pencil, Trash2, UserCheck } from "lucide-react";
import { Td, TableWrap, Th, Tr } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowActions } from "@/components/ui/RowActions";
import { LEAD_SOURCES, LEAD_STATUSES, optionOf } from "@/lib/constants";
import {
  cn,
  formatCurrency,
  formatDate,
  isOverdue,
} from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { LeadFormDialog, type EditableLead } from "./LeadFormDialog";
import { ConvertLeadDialog } from "./ConvertLeadDialog";

export type LeadRow = EditableLead & {
  owner: { id: string; name: string; avatarColor: string };
  convertedClient: { id: string; name: string } | null;
};

/**
 * Leads table plus the dialogs it opens.
 *
 * The rows are fetched on the server and handed down as props; this component
 * exists to own the dialog state and the row actions. After any mutation,
 * useResourceMutation calls router.refresh(), so the server re-queries and the
 * table, the KPI tiles and the activity feed all update together.
 */
export function LeadsTable({
  rows,
  users,
  currentUserId,
  currency,
}: {
  rows: LeadRow[];
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
  currency: string;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useQueryParams();
  const { run } = useResourceMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [converting, setConverting] = useState<LeadRow | null>(null);
  const [deleting, setDeleting] = useState<LeadRow | null>(null);

  // The top-bar quick-add links here with ?new=1.
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
      path: `/api/leads/${deleting.id}`,
      method: "DELETE",
      successMessage: "Lead deleted",
    });
    setDeleting(null);
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Contact className="size-5" />}
          title="No leads match this view"
          description="Adjust the filters above, or add the first prospect to get started."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add a lead
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Lead</Th>
              <Th>Status</Th>
              <Th align="right">Score</Th>
              <Th align="right">Value</Th>
              <Th>Owner</Th>
              <Th>Next follow-up</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => {
              const status = optionOf(LEAD_STATUSES, lead.status);
              const source = optionOf(LEAD_SOURCES, lead.source);
              const late =
                lead.nextFollowUpAt && isOverdue(lead.nextFollowUpAt);

              return (
                <Tr key={lead.id}>
                  <Td>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="group block min-w-0"
                    >
                      <span className="block truncate font-medium text-[var(--text)] group-hover:text-[var(--accent-text)]">
                        {lead.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-subtle)]">
                        {lead.company} &middot; {source.label}
                      </span>
                    </Link>
                  </Td>

                  <Td>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </Td>

                  <Td align="right">
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        lead.score >= 75
                          ? "text-[var(--success-text)]"
                          : lead.score >= 50
                            ? "text-[var(--text)]"
                            : "text-[var(--text-muted)]",
                      )}
                    >
                      {lead.score}
                    </span>
                  </Td>

                  <Td align="right">
                    <span className="text-sm tabular-nums text-[var(--text)]">
                      {formatCurrency(lead.estimatedValue, {
                        currency,
                        compact: true,
                      })}
                    </span>
                  </Td>

                  <Td>
                    <span className="flex items-center gap-2">
                      <Avatar
                        name={lead.owner.name}
                        color={lead.owner.avatarColor}
                        size="xs"
                      />
                      <span className="truncate text-xs text-[var(--text-muted)]">
                        {lead.owner.name}
                      </span>
                    </span>
                  </Td>

                  <Td>
                    <span
                      className={cn(
                        "text-xs",
                        late
                          ? "font-medium text-[var(--danger-text)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      {formatDate(lead.nextFollowUpAt)}
                      {late ? " (overdue)" : ""}
                    </span>
                  </Td>

                  <Td align="right">
                    <RowActions
                      label={`Actions for ${lead.name}`}
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil className="size-3.5" />,
                          onSelect: () => {
                            setEditing(lead);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: lead.convertedClient
                            ? "Already converted"
                            : "Convert to client",
                          icon: <UserCheck className="size-3.5" />,
                          disabled: Boolean(lead.convertedClient),
                          onSelect: () => setConverting(lead),
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 className="size-3.5" />,
                          destructive: true,
                          onSelect: () => setDeleting(lead),
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

      <LeadFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        lead={quickAdd ? null : editing}
        users={users}
        defaultOwnerId={currentUserId}
      />

      <ConvertLeadDialog
        key={converting?.id ?? "none"}
        open={Boolean(converting)}
        onClose={() => setConverting(null)}
        lead={converting}
        users={users}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this lead?"
        message={
          <>
            <strong className="text-[var(--text)]">{deleting?.name}</strong> from{" "}
            {deleting?.company} will be removed, along with their follow-ups and
            history. This cannot be undone.
          </>
        }
        confirmLabel="Delete lead"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** The page header button, kept here so it shares the dialog state. */
export function NewLeadButton({
  users,
  currentUserId,
}: {
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>New lead</Button>
      <LeadFormDialog
        open={open}
        onClose={() => setOpen(false)}
        users={users}
        defaultOwnerId={currentUserId}
      />
    </>
  );
}
