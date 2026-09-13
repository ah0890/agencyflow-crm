import { prisma } from "@/lib/db";

/**
 * Global search behind the top-bar search box.
 *
 * One call fans out across the five entity types people actually look for and
 * returns a flat, already-ranked list so the dropdown can render it directly.
 * SQLite's LIKE is case-insensitive for ASCII, so `contains` is enough here.
 */

export type SearchResult = {
  id: string;
  type: "lead" | "client" | "project" | "deal" | "task";
  title: string;
  subtitle: string;
  href: string;
};

const PER_TYPE = 4;

export async function globalSearch(term: string): Promise<SearchResult[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const [leads, clients, projects, deals, tasks] = await Promise.all([
    prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: PER_TYPE,
      select: { id: true, name: true, company: true, status: true },
    }),
    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { contactName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: PER_TYPE,
      select: { id: true, name: true, contactName: true },
    }),
    prisma.project.findMany({
      where: { name: { contains: q } },
      take: PER_TYPE,
      select: {
        id: true,
        name: true,
        status: true,
        client: { select: { name: true } },
      },
    }),
    prisma.deal.findMany({
      where: {
        OR: [{ title: { contains: q } }, { company: { contains: q } }],
      },
      take: PER_TYPE,
      select: { id: true, title: true, company: true, stage: true },
    }),
    prisma.task.findMany({
      where: { title: { contains: q } },
      take: PER_TYPE,
      select: {
        id: true,
        title: true,
        status: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  return [
    ...leads.map((l) => ({
      id: l.id,
      type: "lead" as const,
      title: l.name,
      subtitle: l.company,
      href: `/leads/${l.id}`,
    })),
    ...clients.map((c) => ({
      id: c.id,
      type: "client" as const,
      title: c.name,
      subtitle: c.contactName,
      href: `/clients/${c.id}`,
    })),
    ...projects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      subtitle: p.client.name,
      href: `/projects/${p.id}`,
    })),
    ...deals.map((d) => ({
      id: d.id,
      type: "deal" as const,
      title: d.title,
      subtitle: d.company,
      href: `/deals?q=${encodeURIComponent(d.company)}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.project?.name ?? "No project",
      href: `/tasks?q=${encodeURIComponent(t.title)}`,
    })),
  ];
}
