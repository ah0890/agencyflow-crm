import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from "@/server/services/clients";
import { createDeal, moveDeal } from "@/server/services/deals";
import { createProject } from "@/server/services/projects";
import { createTask } from "@/server/services/tasks";
import { NotFoundError } from "@/server/errors";
import { makeUser } from "./factories";

function clientInput(managerId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Northwind Interiors",
    contactName: "Helen Carver",
    email: "helen@northwindinteriors.test",
    phone: "+44 20 7946 0112",
    website: "https://northwindinteriors.test",
    industry: "Retail & Furniture",
    status: "ACTIVE",
    address: "42 Shoreditch High St, London",
    notes: "Retainer client.",
    accountManagerId: managerId,
    ...overrides,
  };
}

describe("clients", () => {
  it("creates a client and logs the activity", async () => {
    const manager = await makeUser();

    const client = await createClient(clientInput(manager.id), manager.id);

    expect(client.name).toBe("Northwind Interiors");
    expect(client.status).toBe("ACTIVE");
    expect(client.accountManagerId).toBe(manager.id);

    expect(
      await prisma.activity.count({
        where: { clientId: client.id, type: "CLIENT_CREATED" },
      }),
    ).toBe(1);
  });

  it("rejects invalid input", async () => {
    const manager = await makeUser();

    await expect(
      createClient(clientInput(manager.id, { email: "nope" }), manager.id),
    ).rejects.toThrow();
    await expect(
      createClient(clientInput(manager.id, { name: "" }), manager.id),
    ).rejects.toThrow();

    expect(await prisma.client.count()).toBe(0);
  });

  it("derives revenue from won deals rather than storing it", async () => {
    const manager = await makeUser();
    const client = await createClient(clientInput(manager.id), manager.id);

    const wonA = await createDeal(
      {
        title: "Phase one",
        company: client.name,
        contactName: "Helen",
        value: 30000,
        ownerId: manager.id,
        clientId: client.id,
      },
      manager.id,
    );
    const wonB = await createDeal(
      {
        title: "Phase two",
        company: client.name,
        contactName: "Helen",
        value: 20000,
        ownerId: manager.id,
        clientId: client.id,
      },
      manager.id,
    );
    // An open deal must not count toward revenue.
    await createDeal(
      {
        title: "Phase three",
        company: client.name,
        contactName: "Helen",
        value: 99000,
        stage: "PROPOSAL",
        ownerId: manager.id,
        clientId: client.id,
      },
      manager.id,
    );

    await moveDeal(wonA.id, { stage: "WON" }, manager.id);
    await moveDeal(wonB.id, { stage: "WON" }, manager.id);

    const detail = await getClient(client.id);
    expect(detail.totalValue).toBe(50000);

    // The list view computes the same figure with one grouped query.
    const list = await listClients({});
    expect(list.items[0]?.totalValue).toBe(50000);

    // Editing a deal changes the client total immediately - nothing is cached.
    await moveDeal(wonB.id, { stage: "LOST" }, manager.id);
    expect((await getClient(client.id)).totalValue).toBe(30000);
  });

  it("counts only active projects on the detail view", async () => {
    const manager = await makeUser();
    const client = await createClient(clientInput(manager.id), manager.id);

    await createProject(
      {
        name: "Live work",
        clientId: client.id,
        status: "IN_PROGRESS",
        startDate: "2026-01-01",
        managerId: manager.id,
      },
      manager.id,
    );
    await createProject(
      {
        name: "Planned work",
        clientId: client.id,
        status: "PLANNING",
        startDate: "2026-01-01",
        managerId: manager.id,
      },
      manager.id,
    );
    await createProject(
      {
        name: "Finished work",
        clientId: client.id,
        status: "COMPLETED",
        startDate: "2026-01-01",
        managerId: manager.id,
      },
      manager.id,
    );

    const detail = await getClient(client.id);
    expect(detail.projects).toHaveLength(3);
    expect(detail.activeProjects).toBe(2);
  });

  it("filters and searches", async () => {
    const manager = await makeUser();
    await createClient(clientInput(manager.id), manager.id);
    await createClient(
      clientInput(manager.id, {
        name: "Lumen Health",
        contactName: "Amara Blake",
        email: "amara@lumen.test",
        status: "CHURNED",
      }),
      manager.id,
    );

    expect((await listClients({ status: "ACTIVE" })).total).toBe(1);
    expect((await listClients({ status: "CHURNED" })).total).toBe(1);
    expect((await listClients({ q: "lumen" })).total).toBe(1);
    expect((await listClients({ q: "Amara" })).total).toBe(1);
    expect((await listClients({})).total).toBe(2);
  });

  it("updates a client and records a status change", async () => {
    const manager = await makeUser();
    const client = await createClient(clientInput(manager.id), manager.id);

    const updated = await updateClient(
      client.id,
      { status: "ON_HOLD" },
      manager.id,
    );

    expect(updated.status).toBe("ON_HOLD");
    const activity = await prisma.activity.findFirst({
      where: { clientId: client.id, type: "CLIENT_UPDATED" },
    });
    expect(activity?.detail).toBe("Status ACTIVE -> ON_HOLD");
  });

  it("cascades projects and tasks on delete but keeps deal history", async () => {
    const manager = await makeUser();
    const client = await createClient(clientInput(manager.id), manager.id);

    const project = await createProject(
      {
        name: "Work",
        clientId: client.id,
        startDate: "2026-01-01",
        managerId: manager.id,
      },
      manager.id,
    );
    await createTask({ title: "A task", projectId: project.id }, manager.id);

    const deal = await createDeal(
      {
        title: "Historic revenue",
        company: client.name,
        contactName: "Helen",
        value: 25000,
        ownerId: manager.id,
        clientId: client.id,
      },
      manager.id,
    );
    await moveDeal(deal.id, { stage: "WON" }, manager.id);

    await deleteClient(client.id, manager.id);

    expect(await prisma.client.count()).toBe(0);
    expect(await prisma.project.count()).toBe(0);
    expect(await prisma.task.count()).toBe(0);

    // The deal survives with its client link cleared, so revenue reporting
    // does not lose history when an account is removed.
    const survivingDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(survivingDeal).not.toBeNull();
    expect(survivingDeal?.clientId).toBeNull();
    expect(survivingDeal?.value).toBe(25000);
  });

  it("throws NotFoundError for an unknown client", async () => {
    const user = await makeUser();
    await expect(getClient("nope")).rejects.toThrow(NotFoundError);
    await expect(
      updateClient("nope", { status: "ACTIVE" }, user.id),
    ).rejects.toThrow(NotFoundError);
    await expect(deleteClient("nope", user.id)).rejects.toThrow(NotFoundError);
  });
});
