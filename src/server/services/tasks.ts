import { prisma } from "@/lib/db";
import { PAGE_SIZE, TASK_STATUSES, labelOf } from "@/lib/constants";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/schemas";
import { NotFoundError } from "@/server/errors";
import { logActivity, notify } from "./activity";

/**
 * Task business logic.
 *
 * Completing a task recalculates the parent project's progress percentage.
 * That is the rule that makes the app feel like a real CRM: ticking a checkbox
 * on the tasks page moves the bar on the projects page and the completion
 * figure in Reports, with no manual bookkeeping.
 */

const include = {
  project: { select: { id: true, name: true, clientId: true } },
  assignee: { select: { id: true, name: true, avatarColor: true } },
} as const;

export const TASK_SORT_OPTIONS = [
  { value: "due", label: "Due date" },
  { value: "newest", label: "Newest" },
  { value: "priority", label: "Priority" },
] as const;

const SORTS: Record<string, object> = {
  due: { dueDate: "asc" },
  newest: { createdAt: "desc" },
  priority: { priority: "asc" },
};

export type TaskListOptions = {
  q?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  assigneeId?: string;
  /** "overdue" narrows to incomplete tasks past their due date. */
  scope?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function listTasks(options: TaskListOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const where = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.priority ? { priority: options.priority } : {}),
    ...(options.projectId ? { projectId: options.projectId } : {}),
    ...(options.assigneeId ? { assigneeId: options.assigneeId } : {}),
    ...(options.scope === "overdue"
      ? { status: { not: "COMPLETED" }, dueDate: { lt: new Date() } }
      : {}),
    ...(options.scope === "open" ? { status: { not: "COMPLETED" } } : {}),
    ...(options.q
      ? {
          OR: [
            { title: { contains: options.q } },
            { description: { contains: options.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: (SORTS[options.sort ?? "due"] ?? SORTS.due) as never,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTask(id: string) {
  const task = await prisma.task.findUnique({ where: { id }, include });
  if (!task) throw new NotFoundError("Task");
  return task;
}

export async function createTask(input: unknown, actorId: string) {
  const data = createTaskSchema.parse(input);

  const task = await prisma.task.create({
    data: {
      ...data,
      completedAt: data.status === "COMPLETED" ? new Date() : null,
    },
    include,
  });

  await logActivity({
    type: "TASK_CREATED",
    message: `Task added: ${task.title}`,
    detail: task.project?.name ?? null,
    userId: actorId,
    links: { taskId: task.id, projectId: task.projectId },
  });

  if (task.assigneeId && task.assigneeId !== actorId) {
    await notify({
      userId: task.assigneeId,
      title: "New task assigned to you",
      body: task.title,
      type: "SYSTEM",
      link: "/tasks",
    });
  }

  if (task.projectId) await syncProjectProgress(task.projectId);
  return task;
}

export async function updateTask(id: string, input: unknown, actorId: string) {
  const data = updateTaskSchema.parse(input);

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task");

  const becameComplete =
    data.status === "COMPLETED" && existing.status !== "COMPLETED";
  const reopened =
    data.status && data.status !== "COMPLETED" && existing.status === "COMPLETED";

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      ...(becameComplete ? { completedAt: new Date() } : {}),
      ...(reopened ? { completedAt: null } : {}),
    },
    include,
  });

  await logActivity({
    type: becameComplete ? "TASK_COMPLETED" : "TASK_UPDATED",
    message: becameComplete
      ? `Task completed: ${task.title}`
      : `Task updated: ${task.title}`,
    detail:
      data.status && data.status !== existing.status
        ? `${labelOf(TASK_STATUSES, existing.status)} -> ${labelOf(TASK_STATUSES, task.status)}`
        : null,
    userId: actorId,
    links: { taskId: task.id, projectId: task.projectId },
  });

  // Both the old and the new project need recalculating if the task moved.
  const affected = new Set(
    [existing.projectId, task.projectId].filter(Boolean) as string[],
  );
  for (const projectId of affected) await syncProjectProgress(projectId);

  return task;
}

/** One-click complete/reopen from a list row. */
export async function toggleTask(id: string, actorId: string) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Task");

  return updateTask(
    id,
    { status: existing.status === "COMPLETED" ? "TODO" : "COMPLETED" },
    actorId,
  );
}

export async function deleteTask(id: string, actorId: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError("Task");

  await prisma.task.delete({ where: { id } });
  await logActivity({
    type: "TASK_DELETED",
    message: `Task deleted: ${task.title}`,
    userId: actorId,
    links: { projectId: task.projectId },
  });

  if (task.projectId) await syncProjectProgress(task.projectId);
  return { id };
}

/**
 * Recompute a project's progress from its tasks.
 *
 * Skipped for completed and cancelled projects: those percentages are a
 * historical record, not a live calculation.
 */
export async function syncProjectProgress(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });
  if (!project) return;
  if (project.status === "COMPLETED" || project.status === "CANCELLED") return;

  const [total, done] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: "COMPLETED" } }),
  ]);
  if (total === 0) return;

  await prisma.project.update({
    where: { id: projectId },
    data: { progress: Math.round((done / total) * 100) },
  });
}

export async function getTaskStatusCounts() {
  const rows = await prisma.task.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}
