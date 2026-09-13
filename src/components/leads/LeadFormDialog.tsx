"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/ui/Field";
import { createLeadSchema } from "@/lib/validation/schemas";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { toDateInputValue } from "@/lib/utils";

/**
 * Form values are the schema's *input* type: every control produces a string,
 * and the schema coerces to numbers/dates on parse. Deriving the type instead
 * of hand-writing it keeps the form and the validator from drifting apart.
 */
export type LeadFormValues = z.input<typeof createLeadSchema>;

export type EditableLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  source: string;
  industry: string | null;
  status: string;
  score: number;
  estimatedValue: number;
  notes: string | null;
  nextFollowUpAt: Date | string | null;
  ownerId: string;
};

const toOptions = (list: ReadonlyArray<{ value: string; label: string }>) =>
  list.map((o) => ({ value: o.value, label: o.label }));

/**
 * Create / edit dialog for a lead.
 *
 * The same Zod schema that guards the API validates here, so the user gets
 * immediate feedback and the server still has the final say. Errors the server
 * raises that the client cannot know about (a duplicate, a business rule) come
 * back as field errors and are painted onto the matching input.
 */
export function LeadFormDialog({
  open,
  onClose,
  lead,
  users,
  defaultOwnerId,
}: {
  open: boolean;
  onClose: () => void;
  lead?: EditableLead | null;
  users: Array<{ value: string; label: string }>;
  defaultOwnerId: string;
}) {
  const { run, pending } = useResourceMutation<LeadFormValues>();
  const editing = Boolean(lead);

  const emptyValues: LeadFormValues = {
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "WEBSITE",
    industry: "",
    status: "NEW",
    score: 50,
    estimatedValue: 0,
    notes: "",
    nextFollowUpAt: "",
    ownerId: defaultOwnerId,
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createLeadSchema),
    defaultValues: emptyValues,
  });

  // Load the record being edited (or clear the form) each time it opens.
  useEffect(() => {
    if (!open) return;
    reset(
      lead
        ? // SQLite has no enum type, so status/source arrive as plain strings.
          // They were validated by this same schema on the way in, so widening
          // them back to the form's literal unions is safe here.
          ({
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone ?? "",
            source: lead.source,
            industry: lead.industry ?? "",
            status: lead.status,
            score: lead.score,
            estimatedValue: lead.estimatedValue,
            notes: lead.notes ?? "",
            nextFollowUpAt: toDateInputValue(lead.nextFollowUpAt),
            ownerId: lead.ownerId,
          } as LeadFormValues)
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({
      path: editing ? `/api/leads/${lead!.id}` : "/api/leads",
      method: editing ? "PATCH" : "POST",
      body: values,
      successMessage: editing ? "Lead updated" : "Lead created",
      setError,
    });
    if (result) onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit lead" : "New lead"}
      description={
        editing
          ? "Update this prospect's details."
          : "Capture a new prospect and assign an owner."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            {editing ? "Save changes" : "Create lead"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Contact name"
            required
            placeholder="Jane Doe"
            error={errors.name?.message}
            {...register("name")}
          />
          <TextInput
            label="Company"
            required
            placeholder="Acme Ltd"
            error={errors.company?.message}
            {...register("company")}
          />
          <TextInput
            label="Email"
            type="email"
            required
            placeholder="jane@acme.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextInput
            label="Phone"
            placeholder="+1 555 0100"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <SelectInput
            label="Source"
            options={toOptions(LEAD_SOURCES)}
            error={errors.source?.message}
            {...register("source")}
          />
          <TextInput
            label="Industry"
            placeholder="E-commerce"
            error={errors.industry?.message}
            {...register("industry")}
          />
          <SelectInput
            label="Status"
            options={toOptions(LEAD_STATUSES)}
            error={errors.status?.message}
            {...register("status")}
          />
          <SelectInput
            label="Assigned to"
            required
            options={users}
            error={errors.ownerId?.message}
            {...register("ownerId")}
          />
          <TextInput
            label="Lead score"
            type="number"
            min={0}
            max={100}
            hint="0-100 qualification score"
            error={errors.score?.message}
            {...register("score")}
          />
          <TextInput
            label="Expected deal value"
            type="number"
            min={0}
            step="500"
            prefix="$"
            error={errors.estimatedValue?.message}
            {...register("estimatedValue")}
          />
          <TextInput
            label="Next follow-up"
            type="date"
            className="sm:col-span-2"
            error={errors.nextFollowUpAt?.message}
            {...register("nextFollowUpAt")}
          />
        </div>

        <TextareaInput
          label="Notes"
          rows={3}
          placeholder="What did they ask for? What is the timeline?"
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
