import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createLead } from "@/server/services/leads";
import {
  completeFollowUp,
  createFollowUp,
  deleteFollowUp,
  getFollowUpCounts,
  listFollowUps,
  updateFollowUp,
} from "@/server/services/follow-ups";
import { NotFoundError } from "@/server/errors";
import { makeClient, makeUser } from "./factories";

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

async function makeLead(ownerId: string) {
  return createLead(
    {
      name: "Grace Lindqvist",
      company: "Halcyon Hotels",
      email: "grace@halcyonhotels.com",
      source: "REFERRAL",
      ownerId,
    },
    ownerId,
  );
}

describe("follow-ups", () => {
  it("schedules a follow-up against a lead and syncs the lead's next date", async () => {
    const user = await makeUser();
    const lead = await makeLead(user.id);
    const dueAt = inDays(3);

    const followUp = await createFollowUp(
      {
        title: "Discovery call",
        type: "CALL",
        notes: "Confirm scope and timeline.",
        dueAt,
        ownerId: user.id,
        leadId: lead.id,
        clientId: "",
      },
      user.id,
    );

    expect(followUp.title).toBe("Discovery call");
    expect(followUp.completed).toBe(false);
    expect(followUp.leadId).toBe(lead.id);

    // The lead row must agree with its own follow-up list.
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updatedLead?.nextFollowUpAt?.toISOString()).toBe(
      new Date(dueAt).toISOString(),
    );

    expect(
      await prisma.activity.count({
        where: { followUpId: followUp.id, type: "FOLLOWUP_SCHEDULED" },
      }),
    ).toBe(1);
  });

  it("requires a lead or a client", async () => {
    const user = await makeUser();

    await expect(
      createFollowUp(
        {
          title: "Floating follow-up",
          dueAt: inDays(1),
          ownerId: user.id,
          leadId: "",
          clientId: "",
        },
        user.id,
      ),
    ).rejects.toThrow();

    expect(await prisma.followUp.count()).toBe(0);
  });

  it("completes a follow-up and stamps completedAt", async () => {
    const user = await makeUser();
    const client = await makeClient(user.id);

    const followUp = await createFollowUp(
      {
        title: "Quarterly business review",
        dueAt: inDays(2),
        ownerId: user.id,
        clientId: client.id,
      },
      user.id,
    );

    const done = await completeFollowUp(followUp.id, user.id);

    expect(done.completed).toBe(true);
    expect(done.completedAt).not.toBeNull();
    expect(
      await prisma.activity.count({
        where: { followUpId: followUp.id, type: "FOLLOWUP_COMPLETED" },
      }),
    ).toBe(1);
  });

  it("points the lead at its next outstanding follow-up on completion", async () => {
    const user = await makeUser();
    const lead = await makeLead(user.id);

    const first = await createFollowUp(
      { title: "First call", dueAt: inDays(1), ownerId: user.id, leadId: lead.id },
      user.id,
    );
    const second = await createFollowUp(
      { title: "Second call", dueAt: inDays(9), ownerId: user.id, leadId: lead.id },
      user.id,
    );

    await completeFollowUp(first.id, user.id);

    const afterFirst = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(afterFirst?.nextFollowUpAt?.toISOString()).toBe(
      second.dueAt.toISOString(),
    );

    // Completing the last one clears the lead's next-action date entirely.
    await completeFollowUp(second.id, user.id);
    const afterSecond = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(afterSecond?.nextFollowUpAt).toBeNull();
  });

  it("can be reopened", async () => {
    const user = await makeUser();
    const client = await makeClient(user.id);
    const followUp = await createFollowUp(
      { title: "Check in", dueAt: inDays(1), ownerId: user.id, clientId: client.id },
      user.id,
    );

    await completeFollowUp(followUp.id, user.id);
    const reopened = await updateFollowUp(
      followUp.id,
      { completed: false },
      user.id,
    );

    expect(reopened.completed).toBe(false);
    expect(reopened.completedAt).toBeNull();
  });

  it("filters by scope", async () => {
    const user = await makeUser();
    const client = await makeClient(user.id);

    await createFollowUp(
      { title: "Overdue one", dueAt: inDays(-3), ownerId: user.id, clientId: client.id },
      user.id,
    );
    await createFollowUp(
      { title: "Upcoming one", dueAt: inDays(4), ownerId: user.id, clientId: client.id },
      user.id,
    );
    const done = await createFollowUp(
      { title: "Finished one", dueAt: inDays(-1), ownerId: user.id, clientId: client.id },
      user.id,
    );
    await completeFollowUp(done.id, user.id);

    // Default scope is "not completed".
    expect((await listFollowUps({})).total).toBe(2);
    expect((await listFollowUps({ scope: "overdue" })).total).toBe(1);
    expect((await listFollowUps({ scope: "completed" })).total).toBe(1);
    expect((await listFollowUps({ scope: "all" })).total).toBe(3);

    const counts = await getFollowUpCounts();
    expect(counts.overdue).toBe(1);
    expect(counts.upcoming).toBe(1);
    expect(counts.completed).toBe(1);
  });

  it("throws NotFoundError for an unknown follow-up", async () => {
    const user = await makeUser();
    await expect(completeFollowUp("nope", user.id)).rejects.toThrow(
      NotFoundError,
    );
    await expect(deleteFollowUp("nope", user.id)).rejects.toThrow(
      NotFoundError,
    );
  });
});
