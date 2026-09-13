"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pencil, Trash2, Users } from "lucide-react";
import { Td, TableWrap, Th, Tr } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowActions } from "@/components/ui/RowActions";
import { CLIENT_STATUSES, optionOf } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { ClientFormDialog, type EditableClient } from "./ClientFormDialog";

export type ClientRow = EditableClient & {
  createdAt: Date | string;
  totalValue: number;
  accountManager: { id: string; name: string; avatarColor: string };
  _count: { projects: number; deals: number };
};

/** Clients table plus its create / edit / delete dialogs. */
export function ClientsTable({
  rows,
  users,
  currentUserId,
  currency,
}: {
  rows: ClientRow[];
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
  currency: string;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useQueryParams();
  const { run } = useResourceMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);

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
      path: `/api/clients/${deleting.id}`,
      method: "DELETE",
      successMessage: "Client deleted",
    });
    setDeleting(null);
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No clients match this view"
          description="Convert a qualified lead, or add a client directly."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add a client
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Client</Th>
              <Th>Status</Th>
              <Th align="right">Revenue</Th>
              <Th align="right">Projects</Th>
              <Th>Account manager</Th>
              <Th>Since</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client) => {
              const status = optionOf(CLIENT_STATUSES, client.status);

              return (
                <Tr key={client.id}>
                  <Td>
                    <Link
                      href={`/clients/${client.id}`}
                      className="group block min-w-0"
                    >
                      <span className="block truncate font-medium text-[var(--text)] group-hover:text-[var(--accent-text)]">
                        {client.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-subtle)]">
                        {client.contactName}
                        {client.industry ? ` · ${client.industry}` : ""}
                      </span>
                    </Link>
                  </Td>

                  <Td>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </Td>

                  <Td align="right">
                    <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                      {formatCurrency(client.totalValue, {
                        currency,
                        compact: true,
                      })}
                    </span>
                  </Td>

                  <Td align="right">
                    <span className="text-sm tabular-nums text-[var(--text-muted)]">
                      {client._count.projects}
                    </span>
                  </Td>

                  <Td>
                    <span className="flex items-center gap-2">
                      <Avatar
                        name={client.accountManager.name}
                        color={client.accountManager.avatarColor}
                        size="xs"
                      />
                      <span className="truncate text-xs text-[var(--text-muted)]">
                        {client.accountManager.name}
                      </span>
                    </span>
                  </Td>

                  <Td>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(client.createdAt)}
                    </span>
                  </Td>

                  <Td align="right">
                    <RowActions
                      label={`Actions for ${client.name}`}
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil className="size-3.5" />,
                          onSelect: () => {
                            setEditing(client);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 className="size-3.5" />,
                          destructive: true,
                          onSelect: () => setDeleting(client),
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

      <ClientFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        client={quickAdd ? null : editing}
        users={users}
        defaultManagerId={currentUserId}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this client?"
        message={
          <>
            <strong className="text-[var(--text)]">{deleting?.name}</strong> will
            be removed along with its{" "}
            {deleting?._count.projects ?? 0} project(s) and their tasks. Deals
            stay on record so revenue history is preserved. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete client"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** Page header button, sharing the same dialog. */
export function NewClientButton({
  users,
  currentUserId,
}: {
  users: Array<{ value: string; label: string }>;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>New client</Button>
      <ClientFormDialog
        open={open}
        onClose={() => setOpen(false)}
        users={users}
        defaultManagerId={currentUserId}
      />
    </>
  );
}
