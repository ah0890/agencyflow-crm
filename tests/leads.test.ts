import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  convertLead,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
} from "@/server/services/leads";
import { BusinessRuleError, NotFoundError } from "@/server/errors";
import { makeUser } from "./factories";

/** Valid input for a new lead, so each test only states what it changes. */
function leadInput(ownerId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Grace Lindqvist",
    company: "Halcyon Hotels",
    email: "grace@halcyonhotels.com",
    phone: "+44 20 7946 0100",
    source: "REFERRAL",
    industry: "Hospitality",
    status: "NEW",
    score: 80,
    estimatedValue: 68000,
    notes: "Wants a rebuild before the autumn trade show.",
    nextFollowUpAt: "",
    ownerId,
    ...overrides,
  };
}

describe("leads", () => {
  it("creates a lead and records the activity", async () => {
    const user = await makeUser();

    const lead = await createLead(leadInput(user.id), user.id);

    expect(lead.name).toBe("Grace Lindqvist");
    expect(lead.company).toBe("Halcyon Hotels");
    expect(lead.status).toBe("NEW");
    expect(lead.estimatedValue).toBe(68000);
    // Blank optional date becomes null rather than an invalid date.
    expect(lead.nextFollowUpAt).toBeNull();

    const activity = await prisma.activity.findFirst({
      where: { leadId: lead.id },
    });
    expect(activity?.type).toBe("LEAD_CREATED");
  });

  it("coerces string numbers from form inputs", async () => {
    const user = await makeUser();

    // HTML inputs always submit strings; the schema is what makes them numbers.
    const lead = await createLead(
      leadInput(user.id, { score: "65", estimatedValue: "42000" }),
      user.id,
    );

    expect(lead.score).toBe(65);
    expect(lead.estimatedValue).toBe(42000);
  });

  it("rejects an invalid email and a bad score", async () => {
    const user = await makeUser();

    await expect(
      createLead(leadInput(user.id, { email: "not-an-email" }), user.id),
    ).rejects.toThrow();

    await expect(
      createLead(leadInput(user.id, { score: 250 }), user.id),
    ).rejects.toThrow();

    await expect(
      createLead(leadInput(user.id, { estimatedValue: -5 }), user.id),
    ).rejects.toThrow();

    expect(await prisma.lead.count()).toBe(0);
  });

  it("notifies the owner when someone else assigns them a lead", async () => {
    const creator = await makeUser({ name: "Creator" });
    const owner = await makeUser({ name: "Owner" });

    await createLead(leadInput(owner.id), creator.id);

    const notification = await prisma.notification.findFirst({
      where: { userId: owner.id },
    });
    expect(notification?.type).toBe("LEAD_ASSIGNED");

    // Assigning to yourself should not generate a notification.
    await createLead(leadInput(creator.id), creator.id);
    expect(await prisma.notification.count({ where: { userId: creator.id } })).toBe(0);
  });

  it("logs a dedicated activity when the status changes", async () => {
    const user = await makeUser();
    const lead = await createLead(leadInput(user.id), user.id);

    const updated = await updateLead(
      lead.id,
      { status: "QUALIFIED" },
      user.id,
    );

    expect(updated.status).toBe("QUALIFIED");

    const activity = await prisma.activity.findFirst({
      where: { leadId: lead.id, type: "LEAD_STATUS_CHANGED" },
    });
    expect(activity).not.toBeNull();
    expect(activity?.detail).toBe("New -> Qualified");
  });

  it("logs a plain update when nothing status-related changed", async () => {
    const user = await makeUser();
    const lead = await createLead(leadInput(user.id), user.id);

    await updateLead(lead.id, { notes: "Called, left a voicemail." }, user.id);

    const types = (
      await prisma.activity.findMany({ where: { leadId: lead.id } })
    ).map((a) => a.type);
    expect(types).toContain("LEAD_UPDATED");
    expect(types).not.toContain("LEAD_STATUS_CHANGED");
  });

  it("throws NotFoundError for an unknown id", async () => {
    const user = await makeUser();
    await expect(updateLead("nope", { status: "WON" }, user.id)).rejects.toThrow(
      NotFoundError,
    );
    await expect(deleteLead("nope", user.id)).rejects.toThrow(NotFoundError);
  });

  it("filters and searches", async () => {
    const user = await makeUser();
    await createLead(leadInput(user.id), user.id);
    await createLead(
      leadInput(user.id, {
        name: "Owen Castellanos",
        company: "Pivot Robotics",
        email: "owen@pivotrobotics.com",
        status: "QUALIFIED",
        source: "EVENT",
      }),
      user.id,
    );

    expect((await listLeads({ status: "QUALIFIED" })).total).toBe(1);
    expect((await listLeads({ source: "REFERRAL" })).total).toBe(1);
    expect((await listLeads({ q: "Pivot" })).total).toBe(1);
    // SQLite LIKE is case-insensitive for ASCII, so this must match too.
    expect((await listLeads({ q: "pivot" })).total).toBe(1);
    expect((await listLeads({})).total).toBe(2);
  });

  describe("conversion", () => {
    it("creates a client and a won deal in one transaction", async () => {
      const sales = await makeUser({ name: "Sales" });
      const manager = await makeUser({ name: "Manager", role: "PROJECT_MANAGER" });
      const lead = await createLead(leadInput(sales.id), sales.id);

      const result = await convertLead(
        lead.id,
        { accountManagerId: manager.id, createDeal: true, dealValue: 68000 },
        sales.id,
      );

      expect(result.client.name).toBe("Halcyon Hotels");
      expect(result.client.contactName).toBe("Grace Lindqvist");
      expect(result.client.accountManagerId).toBe(manager.id);

      expect(result.lead.status).toBe("WON");
      expect(result.lead.convertedClientId).toBe(result.client.id);
      expect(result.lead.convertedAt).not.toBeNull();

      expect(result.deal?.stage).toBe("WON");
      expect(result.deal?.value).toBe(68000);
      expect(result.deal?.clientId).toBe(result.client.id);

      const types = (
        await prisma.activity.findMany({ where: { leadId: lead.id } })
      ).map((a) => a.type);
      expect(types).toContain("LEAD_CONVERTED");
    });

    it("can convert without creating a deal", async () => {
      const user = await makeUser();
      const lead = await createLead(leadInput(user.id), user.id);

      const result = await convertLead(
        lead.id,
        { accountManagerId: user.id, createDeal: false },
        user.id,
      );

      expect(result.deal).toBeNull();
      expect(await prisma.deal.count()).toBe(0);
      expect(await prisma.client.count()).toBe(1);
    });

    it("refuses to convert the same lead twice", async () => {
      const user = await makeUser();
      const lead = await createLead(leadInput(user.id), user.id);

      await convertLead(
        lead.id,
        { accountManagerId: user.id, createDeal: false },
        user.id,
      );

      await expect(
        convertLead(
          lead.id,
          { accountManagerId: user.id, createDeal: false },
          user.id,
        ),
      ).rejects.toThrow(BusinessRuleError);

      // Still exactly one client - the second attempt changed nothing.
      expect(await prisma.client.count()).toBe(1);
    });

    it("leaves no partial records when the transaction fails", async () => {
      const user = await makeUser();
      const lead = await createLead(leadInput(user.id), user.id);

      // A non-existent account manager violates the foreign key, so the whole
      // transaction must roll back.
      await expect(
        convertLead(
          lead.id,
          { accountManagerId: "no-such-user", createDeal: true },
          user.id,
        ),
      ).rejects.toThrow();

      expect(await prisma.client.count()).toBe(0);
      expect(await prisma.deal.count()).toBe(0);

      const untouched = await prisma.lead.findUnique({ where: { id: lead.id } });
      expect(untouched?.status).toBe("NEW");
      expect(untouched?.convertedClientId).toBeNull();
    });
  });

  it("deletes a lead and cascades its activities", async () => {
    const user = await makeUser();
    const lead = await createLead(leadInput(user.id), user.id);

    await deleteLead(lead.id, user.id);

    expect(await prisma.lead.count()).toBe(0);
    expect(await prisma.activity.count({ where: { leadId: lead.id } })).toBe(0);
    // The deletion itself is still on the record, unlinked from the gone lead.
    expect(
      await prisma.activity.count({ where: { type: "LEAD_DELETED" } }),
    ).toBe(1);
  });
});
