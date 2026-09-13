"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { LeadFormDialog, type EditableLead } from "./LeadFormDialog";
import { ConvertLeadDialog } from "./ConvertLeadDialog";

/**
 * Edit / convert / delete for a single lead, used in the detail page header.
 * The server component renders everything else; only these actions need state.
 */
export function LeadDetailActions({
  lead,
  users,
  converted,
}: {
  lead: EditableLead;
  users: Array<{ value: string; label: string }>;
  converted: boolean;
}) {
  const router = useRouter();
  const { run } = useResourceMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function confirmDelete() {
    const result = await run({
      path: `/api/leads/${lead.id}`,
      method: "DELETE",
      successMessage: "Lead deleted",
      skipRefresh: true,
    });
    setDeleteOpen(false);
    if (result) router.push("/leads");
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={<Pencil className="size-4" />}
        onClick={() => setEditOpen(true)}
      >
        Edit
      </Button>

      <Button
        icon={<UserCheck className="size-4" />}
        disabled={converted}
        onClick={() => setConvertOpen(true)}
      >
        {converted ? "Converted" : "Convert to client"}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete lead"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <LeadFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={lead}
        users={users}
        defaultOwnerId={lead.ownerId}
      />

      <ConvertLeadDialog
        key={convertOpen ? lead.id : "closed"}
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        lead={lead}
        users={users}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this lead?"
        message={
          <>
            <strong className="text-[var(--text)]">{lead.name}</strong> from{" "}
            {lead.company} will be removed along with their follow-ups and
            history. This cannot be undone.
          </>
        }
        confirmLabel="Delete lead"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
