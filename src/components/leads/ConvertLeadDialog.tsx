"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckboxInput, SelectInput, TextInput } from "@/components/ui/Field";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { formatCurrency } from "@/lib/utils";

type ConvertTarget = {
  id: string;
  name: string;
  company: string;
  estimatedValue: number;
};

/**
 * Lead -> client conversion.
 *
 * The hand-off from sales to delivery. The server does this in a transaction
 * (see convertLead in server/services/leads.ts) so a half-converted lead is
 * impossible. On success the user is taken to the new client record, which is
 * where the next piece of work starts.
 */
export function ConvertLeadDialog({
  open,
  onClose,
  lead,
  users,
}: {
  open: boolean;
  onClose: () => void;
  lead: ConvertTarget | null;
  users: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const { run, pending } = useResourceMutation();

  // The parent remounts this component per lead (see the `key` below), so the
  // initial values are correct on every open without an effect to reset them.
  const [accountManagerId, setAccountManagerId] = useState(
    users[0]?.value ?? "",
  );
  const [createDeal, setCreateDeal] = useState(true);
  const [dealValue, setDealValue] = useState(String(lead?.estimatedValue ?? 0));

  if (!lead) return null;

  async function submit() {
    const result = await run<{ client: { id: string } }>({
      path: `/api/leads/${lead!.id}/convert`,
      method: "POST",
      body: {
        accountManagerId,
        createDeal,
        dealValue: createDeal ? Number(dealValue) : undefined,
      },
      successMessage: `${lead!.company} is now a client`,
    });

    if (result) {
      onClose();
      router.push(`/clients/${result.client.id}`);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convert lead to client"
      description="Creates the client record and marks the lead as won."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending}>
            Convert lead
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {lead.company}
            </p>
            <p className="truncate text-xs text-[var(--text-subtle)]">
              {lead.name}
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-[var(--text-subtle)]" />
          <span className="shrink-0 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[var(--success-text)]">
            Client
          </span>
        </div>

        <SelectInput
          label="Account manager"
          required
          options={users}
          value={accountManagerId}
          onChange={(e) => setAccountManagerId(e.target.value)}
          hint="Who will own the relationship from here."
        />

        <CheckboxInput
          label="Also create a won deal"
          description={`Records ${formatCurrency(Number(dealValue) || 0)} against the new client so revenue reporting stays accurate.`}
          checked={createDeal}
          onChange={(e) => setCreateDeal(e.target.checked)}
        />

        {createDeal ? (
          <TextInput
            label="Deal value"
            type="number"
            min={0}
            step="500"
            prefix="$"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
          />
        ) : null}
      </div>
    </Modal>
  );
}
