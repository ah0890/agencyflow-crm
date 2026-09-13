"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput, TextareaInput } from "@/components/ui/Field";
import { createFollowUpSchema } from "@/lib/validation/schemas";
import { FOLLOWUP_TYPES } from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { toDateTimeInputValue } from "@/lib/utils";

export type FollowUpFormValues = z.input<typeof createFollowUpSchema>;

export type EditableFollowUp = {
  id: string;
  title: string;
  type: string;
  notes: string | null;
  dueAt: Date | string;
  ownerId: string;
  leadId: string | null;
  clientId: string | null;
};

/**
 * Create / edit dialog for a follow-up.
 *
 * A follow-up must hang off either a lead or a client - that rule lives in the
 * Zod schema (a `.refine`), so the same message appears whether the user
 * submits from here or something posts to the API directly.
 */
export function FollowUpFormDialog({
  open,
  onClose,
  followUp,
  leads,
  clients,
  users,
  defaultOwnerId,
  defaultLeadId,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  followUp?: EditableFollowUp | null;
  leads: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  defaultOwnerId: string;
  defaultLeadId?: string;
  defaultClientId?: string;
}) {
  const { run, pending } = useResourceMutation<FollowUpFormValues>();
  const editing = Boolean(followUp);

  // Default to tomorrow morning - the most common case is "call them back".
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const emptyValues: FollowUpFormValues = {
    title: "",
    type: "CALL",
    notes: "",
    dueAt: toDateTimeInputValue(tomorrow),
    ownerId: defaultOwnerId,
    leadId: defaultLeadId ?? "",
    clientId: defaultClientId ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createFollowUpSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      followUp
        ? ({
            title: followUp.title,
            type: followUp.type,
            notes: followUp.notes ?? "",
            dueAt: toDateTimeInputValue(followUp.dueAt),
            ownerId: followUp.ownerId,
            leadId: followUp.leadId ?? "",
            clientId: followUp.clientId ?? "",
          } as FollowUpFormValues)
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, followUp]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({
      path: editing ? `/api/follow-ups/${followUp!.id}` : "/api/follow-ups",
      method: editing ? "PATCH" : "POST",
      body: values,
      successMessage: editing ? "Follow-up updated" : "Follow-up scheduled",
      setError,
    });
    if (result) onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit follow-up" : "Schedule a follow-up"}
      description="Link it to a lead or a client so it shows on their record."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            {editing ? "Save changes" : "Schedule"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextInput
          label="Title"
          required
          placeholder="Discovery call"
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Type"
            options={FOLLOWUP_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
            error={errors.type?.message}
            {...register("type")}
          />
          <TextInput
            label="Date and time"
            type="datetime-local"
            required
            error={errors.dueAt?.message}
            {...register("dueAt")}
          />
          <SelectInput
            label="Related lead"
            placeholder="No lead"
            options={leads}
            error={errors.leadId?.message}
            {...register("leadId")}
          />
          <SelectInput
            label="Related client"
            placeholder="No client"
            options={clients}
            error={errors.clientId?.message}
            {...register("clientId")}
          />
          <SelectInput
            label="Assigned to"
            required
            className="sm:col-span-2"
            options={users}
            error={errors.ownerId?.message}
            {...register("ownerId")}
          />
        </div>

        <TextareaInput
          label="Notes"
          rows={3}
          placeholder="What needs to be covered?"
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
