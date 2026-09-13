import { prisma } from "@/lib/db";
import { ACTIVE_PROJECT_STATUSES, PAGE_SIZE } from "@/lib/constants";
import {
  createClientSchema,
  updateClientSchema,
} from "@/lib/validation/schemas";
import { NotFoundError } from "@/server/errors";
import { logActivity } from "./activity";

/**
 * Client business logic.
 *
 * "Total business value" is deliberately derived from won deals rather than
 * stored on the client row. A stored total would drift the moment a deal was
 * edited; deriving it means the number is always the truth.
 */

const listInclude = {
  accountManager: { select: { id: true, name: true, avatarColor: true } },
  _count: { select: { projects: true, deals: true } },
} as const;

export const CLIENT_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A-Z" },
  { value: "projects", label: "Most projects" },
] as const;

const SORTS: Record<string, object> = {
  newest: { createdAt: "desc" },
  name: { name: "asc" },
  projects: { projects: { _count: "desc" } },
};

export type ClientListOptions = {
  q?: string;
  status?: string;
  accountManagerId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function listClients(options: ClientListOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PAGE_SIZE;

  const where = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.accountManagerId
      ? { accountManagerId: options.accountManagerId }
      : {}),
    ...(options.q
      ? {
          OR: [
            { name: { contains: options.q } },
            { contactName: { contains: options.q } },
            { email: { contains: options.q } },
            { industry: { contains: options.q } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: (SORTS[options.sort ?? "newest"] ?? SORTS.newest) as never,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: listInclude,
    }),
    prisma.client.count({ where }),
  ]);

  // One grouped query gives every row its revenue figure without an N+1.
  const wonByClient = await prisma.deal.groupBy({
    by: ["clientId"],
    where: {
      stage: "WON",
      clientId: { in: items.map((c) => c.id) },
    },
    _sum: { value: true },
  });
  const revenue = new Map(
    wonByClient.map((r) => [r.clientId, r._sum.value ?? 0]),
  );

  return {
    items: items.map((c) => ({ ...c, totalValue: revenue.get(c.id) ?? 0 })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      accountManager: { select: { id: true, name: true, avatarColor: true } },
      projects: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { tasks: true } } },
      },
      deals: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { dueAt: "asc" }, where: { completed: false } },
    },
  });
  if (!client) throw new NotFoundError("Client");

  const totalValue = client.deals
    .filter((d) => d.stage === "WON")
    .reduce((sum, d) => sum + d.value, 0);

  const activeProjects = client.projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.includes(p.status as never),
  ).length;

  return { ...client, totalValue, activeProjects };
}

export async function createClient(input: unknown, actorId: string) {
  const data = createClientSchema.parse(input);
  const client = await prisma.client.create({ data, include: listInclude });

  await logActivity({
    type: "CLIENT_CREATED",
    message: `${client.name} became a client`,
    detail: client.industry,
    userId: actorId,
    links: { clientId: client.id },
  });

  return client;
}

export async function updateClient(
  id: string,
  input: unknown,
  actorId: string,
) {
  const data = updateClientSchema.parse(input);
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Client");

  const client = await prisma.client.update({
    where: { id },
    data,
    include: listInclude,
  });

  await logActivity({
    type: "CLIENT_UPDATED",
    message: `${client.name} was updated`,
    detail:
      data.status && data.status !== existing.status
        ? `Status ${existing.status} -> ${client.status}`
        : null,
    userId: actorId,
    links: { clientId: client.id },
  });

  return client;
}

export async function deleteClient(id: string, actorId: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!client) throw new NotFoundError("Client");

  // Projects cascade with the client (see schema); deals are unlinked instead
  // so historical revenue is never silently destroyed.
  await prisma.client.delete({ where: { id } });

  await logActivity({
    type: "CLIENT_DELETED",
    message: `Client ${client.name} was deleted`,
    detail:
      client._count.projects > 0
        ? `${client._count.projects} project(s) were removed with it`
        : null,
    userId: actorId,
  });

  return { id };
}

/** Lightweight list for <select> inputs. */
export async function getClientOptions() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return clients.map((c) => ({ value: c.id, label: c.name }));
}
