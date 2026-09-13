"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput, TextareaInput } from "@/components/ui/Field";
import { createTaskSchema } from "@/lib/validation/schemas";
import { PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { toDateInputValue } from "@/lib/utils";

export type TaskFormValues = z.input<typeof createTaskSchema>;

export type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  projectId: string | null;
  assigneeId: string | null;
};

const options = (list: ReadonlyArray<{ value: string; label: string }>) =>
  list.map((o) => ({ value: o.value, label: o.label }));

/** Create / edit dialog for a task. */
export function TaskFormDialog({
  open,
  onClose,
  task,
  projects,
  users,
  defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  task?: EditableTask | null;
  projects: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
  defaultProjectId?: string;
}) {
  const { run, pending } = useResourceMutation<TaskFormValues>();
  const editing = Boolean(task);

  const emptyValues: TaskFormValues = {
    title: "",
    description: "",
    projectId: defaultProjectId ?? "",
    assigneeId: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      task
        ? ({
            title: task.title,
            description: task.description ?? "",
            projectId: task.projectId ?? "",
            assigneeId: task.assigneeId ?? "",
            priority: task.priority,
            status: task.status,
            dueDate: toDateInputValue(task.dueDate),
          } as TaskFormValues)
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({
      path: editing ? `/api/tasks/${task!.id}` : "/api/tasks",
      method: editing ? "PATCH" : "POST",
      body: values,
      successMessage: editing ? "Task updated" : "Task created",
      setError,
    });
    if (result) onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit task" : "New task"}
      description={
        editing
          ? "Update this piece of work."
          : "Add work to a project, or leave it unassigned to a project."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={pending}>
            {editing ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextInput
          label="Task title"
          required
          placeholder="Wireframe the key templates"
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Project"
            placeholder="No project (internal task)"
            options={projects}
            error={errors.projectId?.message}
            {...register("projectId")}
          />
          <SelectInput
            label="Assignee"
            placeholder="Unassigned"
            options={users}
            error={errors.assigneeId?.message}
            {...register("assigneeId")}
          />
          <SelectInput
            label="Status"
            options={options(TASK_STATUSES)}
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
            label="Due date"
            type="date"
            className="sm:col-span-2"
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />
        </div>

        <TextareaInput
          label="Description"
          rows={3}
          placeholder="Any detail the assignee needs."
          error={errors.description?.message}
          {...register("description")}
        />
      </form>
    </Modal>
  );
}
