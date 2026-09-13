"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput, TextareaInput } from "@/components/ui/Field";
import { createDealSchema } from "@/lib/validation/schemas";
import { DEAL_STAGES } from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { toDateInputValue } from "@/lib/utils";

export type DealFormValues = z.input<typeof createDealSchema>;

export type EditableDeal = {
  id: string;
  title: string;
  company: string;
  contactName: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: Date | string | null;
  notes: string | null;
  ownerId: string;
  clientId: string | null;
};

/**
 * Create / edit dialog for a deal.
 *
 * Probability is intentionally not on this form: it is derived from the stage
 * by the service layer, so the board and the form can never disagree about
 * what a "Negotiation" deal is worth in a forecast.
 */
export function DealFormDialog({
  open,
  onClose,
  deal,
  users,
  clients,
  defaultOwnerId,
}: {
  open: boolean;
  onClose: () => void;
  deal?: EditableDeal | null;
  users: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  defaultOwnerId: string;
}) {
  const { run, pending } = useResourceMutation<DealFormValues>();
  const editing = Boolean(deal);

  const emptyValues: DealFormValues = {
    title: "",
    company: "",
    contactName: "",
    value: 0,
    stage: "NEW",
    expectedCloseDate: "",
    notes: "",
    ownerId: defaultOwnerId,
    clientId: "",
    leadId: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createDealSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      deal
        ? ({
            title: deal.title,
            company: deal.company,
            contactName: deal.contactName,
            value: deal.value,
            stage: deal.stage,
            expectedCloseDate: toDateInputValue(deal.expectedCloseDate),
            notes: deal.notes ?? "",
            ownerId: deal.ownerId,
            clientId: deal.clientId ?? "",
            leadId: "",
          } as DealFormValues)
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({
      path: editing ? `/api/deals/${deal!.id}` : "/api/deals",
      method: editing ? "PATCH" : "POST",
      body: values,
      successMessage: editing ? "Deal updated" : "Deal created",
      setError,
    });
    if (result) onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit deal" : "New deal"}
      description={
        editing
          ? "Update this opportunity."
          : "Add an opportunity to the sales pipeline."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            {editing ? "Save changes" : "Create deal"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextInput
          label="Deal title"
          required
          placeholder="Northwind Interiors - Website Rebuild"
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Company"
            required
            placeholder="Northwind Interiors"
            error={errors.company?.message}
            {...register("company")}
          />
          <TextInput
            label="Contact person"
            required
            placeholder="Helen Carver"
            error={errors.contactName?.message}
            {...register("contactName")}
          />
          <TextInput
            label="Deal value"
            type="number"
            min={0}
            step="500"
            prefix="$"
            error={errors.value?.message}
            {...register("value")}
          />
          <SelectInput
            label="Stage"
            options={DEAL_STAGES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
            hint="Win probability follows the stage automatically."
            error={errors.stage?.message}
            {...register("stage")}
          />
          <SelectInput
            label="Assigned to"
            required
            options={users}
            error={errors.ownerId?.message}
            {...register("ownerId")}
          />
          <TextInput
            label="Expected close date"
            type="date"
            error={errors.expectedCloseDate?.message}
            {...register("expectedCloseDate")}
          />
          <SelectInput
            label="Linked client"
            className="sm:col-span-2"
            placeholder="Not linked to an existing client"
            options={clients}
            hint="Link a deal to a client so it counts toward their revenue."
            error={errors.clientId?.message}
            {...register("clientId")}
          />
        </div>

        <TextareaInput
          label="Notes"
          rows={3}
          placeholder="Scope discussed, blockers, next step..."
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
