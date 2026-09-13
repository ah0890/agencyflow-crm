"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Field,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/ui/Field";
import { createProjectSchema } from "@/lib/validation/schemas";
import {
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { toDateInputValue } from "@/lib/utils";

export type ProjectFormValues = z.input<typeof createProjectSchema>;

export type EditableProject = {
  id: string;
  name: string;
  clientId: string;
  type: string;
  status: string;
  priority: string;
  description: string | null;
  budget: number;
  progress: number;
  startDate: Date | string;
  deadline: Date | string | null;
  managerId: string;
  memberIds: string[];
};

const options = (list: ReadonlyArray<{ value: string; label: string }>) =>
  list.map((o) => ({ value: o.value, label: o.label }));

/**
 * Create / edit dialog for a project.
 *
 * Team members are a set: the service replaces the whole membership list on
 * save rather than diffing it, which keeps the join-table logic simple and
 * idempotent.
 */
export function ProjectFormDialog({
  open,
  onClose,
  project,
  clients,
  users,
  defaultManagerId,
}: {
  open: boolean;
  onClose: () => void;
  project?: EditableProject | null;
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  defaultManagerId: string;
}) {
  const { run, pending } = useResourceMutation<ProjectFormValues>();
  const editing = Boolean(project);

  const emptyValues: ProjectFormValues = {
    name: "",
    clientId: clients[0]?.value ?? "",
    type: "WEB_DEVELOPMENT",
    status: "PLANNING",
    priority: "MEDIUM",
    description: "",
    budget: 0,
    progress: 0,
    startDate: toDateInputValue(new Date()),
    deadline: "",
    managerId: defaultManagerId,
    memberIds: [],
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      project
        ? ({
            name: project.name,
            clientId: project.clientId,
            type: project.type,
            status: project.status,
            priority: project.priority,
            description: project.description ?? "",
            budget: project.budget,
            progress: project.progress,
            startDate: toDateInputValue(project.startDate),
            deadline: toDateInputValue(project.deadline),
            managerId: project.managerId,
            memberIds: project.memberIds,
          } as ProjectFormValues)
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({
      path: editing ? `/api/projects/${project!.id}` : "/api/projects",
      method: editing ? "PATCH" : "POST",
      body: values,
      successMessage: editing ? "Project updated" : "Project created",
      setError,
    });
    if (result) onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit project" : "New project"}
      description={
        editing
          ? "Update scope, dates and staffing."
          : "Set up a piece of delivery work for a client."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            {editing ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextInput
          label="Project name"
          required
          placeholder="Website Redesign & Build"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Client"
            required
            options={clients}
            placeholder={clients.length === 0 ? "Add a client first" : undefined}
            error={errors.clientId?.message}
            {...register("clientId")}
          />
          <SelectInput
            label="Project type"
            options={options(PROJECT_TYPES)}
            error={errors.type?.message}
            {...register("type")}
          />
          <SelectInput
            label="Status"
            options={options(PROJECT_STATUSES)}
            error={errors.status?.message}
            {...register("status")}
          />
          <SelectInput
            label="Priority"
            options={options(PRIORITIES)}
            error={errors.priority?.message}
            {...register("priority")}
          />
          <TextInput
            label="Start date"
            type="date"
            required
            error={errors.startDate?.message}
            {...register("startDate")}
          />
          <TextInput
            label="Deadline"
            type="date"
            error={errors.deadline?.message}
            {...register("deadline")}
          />
          <TextInput
            label="Budget"
            type="number"
            min={0}
            step="500"
            prefix="$"
            error={errors.budget?.message}
            {...register("budget")}
          />
          <TextInput
            label="Progress"
            type="number"
            min={0}
            max={100}
            hint="Recalculated automatically as tasks complete."
            error={errors.progress?.message}
            {...register("progress")}
          />
          <SelectInput
            label="Project manager"
            required
            className="sm:col-span-2"
            options={users}
            error={errors.managerId?.message}
            {...register("managerId")}
          />
        </div>

        <Field
          label="Team members"
          hint="The project manager is included automatically."
          error={errors.memberIds?.message}
        >
          <div className="grid gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:grid-cols-2">
            {users.map((member) => (
              <label
                key={member.value}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--text)]"
              >
                <input
                  type="checkbox"
                  value={member.value}
                  className="size-4 rounded border-[var(--border-strong)] bg-[var(--surface)] accent-[var(--accent)]"
                  {...register("memberIds")}
                />
                {member.label}
              </label>
            ))}
          </div>
        </Field>

        <TextareaInput
          label="Description"
          rows={3}
          placeholder="What is being delivered, and what does done look like?"
          error={errors.description?.message}
          {...register("description")}
        />
      </form>
    </Modal>
  );
}
