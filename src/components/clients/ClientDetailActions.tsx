"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { ClientFormDialog, type EditableClient } from "./ClientFormDialog";

/** Edit / delete for a single client, used in the detail page header. */
export function ClientDetailActions({
  client,
  users,
}: {
  client: EditableClient & { projects: Array<{ id: string }> };
  users: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const { run } = useResourceMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function confirmDelete() {
    const result = await run({
      path: `/api/clients/${client.id}`,
      method: "DELETE",
      successMessage: "Client deleted",
      skipRefresh: true,
    });
    setDeleteOpen(false);
    if (result) router.push("/clients");
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={<Pencil className="size-4" />}
        onClick={() => setEditOpen(true)}
      >
        Edit client
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete client"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <ClientFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        users={users}
        defaultManagerId={client.accountManagerId}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this client?"
        message={
          <>
            <strong className="text-[var(--text)]">{client.name}</strong> will be
            removed along with its {client.projects.length} project(s) and their
            tasks. This cannot be undone.
          </>
        }
        confirmLabel="Delete client"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
