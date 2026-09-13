"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import {
  ProjectFormDialog,
  type EditableProject,
} from "./ProjectFormDialog";

/** Edit / delete for a single project, used in the detail page header. */
export function ProjectDetailActions({
  project,
  clients,
  users,
}: {
  project: EditableProject & { tasks: Array<{ id: string }> };
  clients: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const { run } = useResourceMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function confirmDelete() {
    const result = await run({
      path: `/api/projects/${project.id}`,
      method: "DELETE",
      successMessage: "Project deleted",
      skipRefresh: true,
    });
    setDeleteOpen(false);
    if (result) router.push("/projects");
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={<Pencil className="size-4" />}
        onClick={() => setEditOpen(true)}
      >
        Edit project
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete project"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <ProjectFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        clients={clients}
        users={users}
        defaultManagerId={project.managerId}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this project?"
        message={
          <>
            <strong className="text-[var(--text)]">{project.name}</strong> and
            its {project.tasks.length} task(s) will be removed. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete project"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
