import { prisma } from "@/lib/db";
import {
  PAGE_SIZE,
  PROJECT_STATUSES,
  labelOf,
} from "@/lib/constants";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validation/schemas";
import { NotFoundError } from "@/server/errors";
import { logActivity, notify } from "./activity";

/**
 * Project business logic.
 *
 * Team membership is a join table, so adding or removing people is a set
 * operation rather than a column edit. Marking a project Completed stamps
 * completedAt and forces progress to 100 so the reports cannot disagree with
 * the status badge.
 */

const listInclude = {
  client: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true, avatarColor: true } },
  // Needed so the edit dialog can pre-tick the current team. Without it an
  // edit would save an empty membership list and silently unstaff the project.
  members: { select: { userId: true } },
  _count: { select: { tasks: true, members: true } },
} as const;

export const PROJECT_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "deadline", label: "Deadline" },
  { value: "budget", label: "Largest budget" },
  { value: "progress", label: "Most complete" },
] as const;

const SORTS: Record<string, object> = {
  newest: { createdAt: "desc" },
  deadline: { deadline: "asc" },
  budget: { budget: "desc" },
  progress: { progress: "desc" },
};

export type ProjectListOptions = {
  q?: string;
  status?: string;
  clientId?: string;
  priority?: string;
  managerId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function listProjects(options: ProjectListOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const where = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.clientId ? { clientId: options.clientId } : {}),
    ...(options.priority ? { priority: options.priority } : {}),
    ...(options.managerId ? { managerId: options.managerId } : {}),
    ...(options.q
      ? {
          OR: [
            { name: { contains: options.q } },
            { description: { contains: options.q } },
            { client: { name: { contains: options.q } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: (SORTS[options.sort ?? "newest"] ?? SORTS.newest) as never,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: listInclude,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, contactName: true, email: true } },
      manager: { select: { id: true, name: true, avatarColor: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatarColor: true, jobTitle: true } },
        },
      },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: {
          assignee: { select: { id: true, name: true, avatarColor: true } },
        },
      },
    },
  });
  if (!project) throw new NotFoundError("Project");
  return project;
}

export async function createProject(input: unknown, actorId: string) {
  const { memberIds, ...data } = createProjectSchema.parse(input);

  const project = await prisma.project.create({
    data: {
      ...data,
      completedAt: data.status === "COMPLETED" ? new Date() : null,
      members: {
        create: memberIds
          .filter((userId) => userId !== data.managerId)
          .map((userId) => ({ userId })),
      },
    },
    include: listInclude,
  });

  await logActivity({
    type: "PROJECT_CREATED",
    message: `Project started: ${project.name}`,
    detail: project.client.name,
    userId: actorId,
    links: { projectId: project.id, clientId: project.clientId },
  });

  if (project.managerId !== actorId) {
    await notify({
      userId: project.managerId,
      title: "You are managing a new project",
      body: `${project.name} for ${project.client.name}.`,
      type: "SYSTEM",
      link: `/projects/${project.id}`,
    });
  }

  return project;
}

export async function updateProject(
  id: string,
  input: unknown,
  actorId: string,
) {
  const { memberIds, ...data } = updateProjectSchema.parse(input);

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Project");

  const becameComplete =
    data.status === "COMPLETED" && existing.status !== "COMPLETED";
  const leftComplete =
    data.status && data.status !== "COMPLETED" && existing.status === "COMPLETED";

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      // Keep progress and status honest with each other.
      ...(becameComplete ? { completedAt: new Date(), progress: 100 } : {}),
      ...(leftComplete ? { completedAt: null } : {}),
      ...(memberIds
        ? {
            members: {
              deleteMany: {},
              create: memberIds
                .filter((userId) => userId !== (data.managerId ?? existing.managerId))
                .map((userId) => ({ userId })),
            },
          }
        : {}),
    },
    include: listInclude,
  });

  if (data.status && data.status !== existing.status) {
    await logActivity({
      type: "PROJECT_STATUS_CHANGED",
      message: `${project.name} moved to ${labelOf(PROJECT_STATUSES, project.status)}`,
      detail: `${labelOf(PROJECT_STATUSES, existing.status)} -> ${labelOf(PROJECT_STATUSES, project.status)}`,
      userId: actorId,
      links: { projectId: project.id },
    });
  } else {
    await logActivity({
      type: "PROJECT_UPDATED",
      message: `Project updated: ${project.name}`,
      userId: actorId,
      links: { projectId: project.id },
    });
  }

  return project;
}

export async function deleteProject(id: string, actorId: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { tasks: true } } },
  });
  if (!project) throw new NotFoundError("Project");

  await prisma.project.delete({ where: { id } });

  await logActivity({
    type: "PROJECT_DELETED",
    message: `Project deleted: ${project.name}`,
    detail:
      project._count.tasks > 0
        ? `${project._count.tasks} task(s) were removed with it`
        : null,
    userId: actorId,
  });

  return { id };
}

/** Counts per status for the projects-by-status chart. */
export async function getProjectStatusCounts() {
  const rows = await prisma.project.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

/** Lightweight list for <select> inputs. */
export async function getProjectOptions() {
  const projects = await prisma.project.findMany({
    where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, client: { select: { name: true } } },
  });
  return projects.map((p) => ({
    value: p.id,
    label: `${p.name} - ${p.client.name}`,
  }));
}
