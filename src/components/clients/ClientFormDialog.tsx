"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput, TextareaInput } from "@/components/ui/Field";
import { createClientSchema } from "@/lib/validation/schemas";
import { CLIENT_STATUSES } from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";

export type ClientFormValues = z.input<typeof createClientSchema>;

export type EditableClient = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  address: string | null;
  notes: string | null;
  accountManagerId: string;
};

/** Create / edit dialog for a client account. */
export function ClientFormDialog({
  open,
  onClose,
  client,
  users,
  defaultManagerId,
}: {
  open: boolean;
  onClose: () => void;
  client?: EditableClient | null;
  users: Array<{ value: string; label: string }>;
  defaultManagerId: string;
}) {
  const { run, pending } = useResourceMutation<ClientFormValues>();
  const editing = Boolean(client);

  const emptyValues: ClientFormValues = {
    name: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    status: "ACTIVE",
    address: "",
    notes: "",
    accountManagerId: defaultManagerId,
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createClientSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      client
        ? ({
            name: client.name,
            contactName: client.contactName,
            email: client.email,
            phone: client.phone ?? "",
            website: client.website ?? "",
            industry: client.industry ?? "",
            status: client.status,
            address: client.address ?? "",
            notes: client.notes ?? "",
            accountManagerId: client.accountManagerId,
          } as ClientFormValues)
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({
      path: editing ? `/api/clients/${client!.id}` : "/api/clients",
      method: editing ? "PATCH" : "POST",
      body: values,
      successMessage: editing ? "Client updated" : "Client created",
      setError,
    });
    if (result) onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit client" : "New client"}
      description={
        editing
          ? "Update this account's details."
          : "Add a company the agency is delivering work for."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            {editing ? "Save changes" : "Create client"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Company name"
            required
            placeholder="Northwind Interiors"
            error={errors.name?.message}
            {...register("name")}
          />
          <TextInput
            label="Primary contact"
            required
            placeholder="Helen Carver"
            error={errors.contactName?.message}
            {...register("contactName")}
          />
          <TextInput
            label="Email"
            type="email"
            required
            placeholder="helen@northwind.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextInput
            label="Phone"
            placeholder="+44 20 7946 0112"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <TextInput
            label="Website"
            placeholder="https://northwind.com"
            error={errors.website?.message}
            {...register("website")}
          />
          <TextInput
            label="Industry"
            placeholder="Retail & Furniture"
            error={errors.industry?.message}
            {...register("industry")}
          />
          <SelectInput
            label="Status"
            options={CLIENT_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
            error={errors.status?.message}
            {...register("status")}
          />
          <SelectInput
            label="Account manager"
            required
            options={users}
            error={errors.accountManagerId?.message}
            {...register("accountManagerId")}
          />
        </div>

        <TextInput
          label="Address"
          placeholder="42 Shoreditch High St, London"
          error={errors.address?.message}
          {...register("address")}
        />

        <TextareaInput
          label="Notes"
          rows={3}
          placeholder="Billing terms, key context, preferences..."
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
