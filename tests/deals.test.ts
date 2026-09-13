import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createDeal,
  deleteDeal,
  getPipelineSummary,
  listBoardDeals,
  moveDeal,
  updateDeal,
} from "@/server/services/deals";
import { NotFoundError } from "@/server/errors";
import { makeUser } from "./factories";

function dealInput(ownerId: string, overrides: Record<string, unknown> = {}) {
  return {
    title: "Halcyon Hotels - Website Rebuild",
    company: "Halcyon Hotels",
    contactName: "Grace Lindqvist",
    value: 68000,
    stage: "NEW",
    expectedCloseDate: "",
    notes: "",
    ownerId,
    leadId: "",
    clientId: "",
    ...overrides,
  };
}

describe("deals and the pipeline", () => {
  it("creates a deal with the stage's default probability", async () => {
    const user = await makeUser();

    const deal = await createDeal(dealInput(user.id), user.id);

    expect(deal.stage).toBe("NEW");
    expect(deal.probability).toBe(10);
    expect(deal.closedAt).toBeNull();

    const activity = await prisma.activity.findFirst({
      where: { dealId: deal.id },
    });
    expect(activity?.type).toBe("DEAL_CREATED");
  });

  it("moves a deal between stages and updates probability", async () => {
    const user = await makeUser();
    const deal = await createDeal(dealInput(user.id), user.id);

    const qualified = await moveDeal(deal.id, { stage: "QUALIFIED" }, user.id);
    expect(qualified.stage).toBe("QUALIFIED");
    expect(qualified.probability).toBe(40);
    expect(qualified.closedAt).toBeNull();

    const negotiating = await moveDeal(
      deal.id,
      { stage: "NEGOTIATION" },
      user.id,
    );
    expect(negotiating.probability).toBe(80);
  });

  it("stamps closedAt when a deal is won, and clears it if reopened", async () => {
    const user = await makeUser();
    const deal = await createDeal(dealInput(user.id), user.id);

    const won = await moveDeal(deal.id, { stage: "WON" }, user.id);
    expect(won.stage).toBe("WON");
    expect(won.probability).toBe(100);
    expect(won.closedAt).not.toBeNull();

    const reopened = await moveDeal(deal.id, { stage: "PROPOSAL" }, user.id);
    expect(reopened.closedAt).toBeNull();
    expect(reopened.probability).toBe(60);
  });

  it("records the right activity type for won and lost", async () => {
    const user = await makeUser();

    const winner = await createDeal(dealInput(user.id), user.id);
    await moveDeal(winner.id, { stage: "WON" }, user.id);

    const loser = await createDeal(
      dealInput(user.id, { title: "Lost deal" }),
      user.id,
    );
    await moveDeal(loser.id, { stage: "LOST" }, user.id);

    expect(
      await prisma.activity.count({ where: { type: "DEAL_WON" } }),
    ).toBe(1);
    expect(
      await prisma.activity.count({ where: { type: "DEAL_LOST" } }),
    ).toBe(1);

    const stageChange = await prisma.activity.findFirst({
      where: { dealId: winner.id, type: "DEAL_WON" },
    });
    expect(stageChange?.detail).toBe("New -> Won");
  });

  it("notifies the owner when a deal closes", async () => {
    const owner = await makeUser({ name: "Owner" });
    const deal = await createDeal(dealInput(owner.id), owner.id);

    await moveDeal(deal.id, { stage: "WON" }, owner.id);

    const notification = await prisma.notification.findFirst({
      where: { userId: owner.id, type: "DEAL_STAGE_CHANGED" },
    });
    expect(notification?.level).toBe("SUCCESS");
  });

  it("does not log a stage change when the stage is unchanged", async () => {
    const user = await makeUser();
    const deal = await createDeal(dealInput(user.id), user.id);

    await moveDeal(deal.id, { stage: "NEW", position: 3 }, user.id);

    const moved = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(moved?.position).toBe(3);
    expect(
      await prisma.activity.count({
        where: { dealId: deal.id, type: "DEAL_STAGE_CHANGED" },
      }),
    ).toBe(0);
  });

  it("applies the same stage rules when edited through the form", async () => {
    const user = await makeUser();
    const deal = await createDeal(dealInput(user.id), user.id);

    // Editing the stage in the dialog must behave exactly like dragging.
    const updated = await updateDeal(deal.id, { stage: "WON" }, user.id);
    expect(updated.probability).toBe(100);
    expect(updated.closedAt).not.toBeNull();
  });

  it("rejects an unknown stage", async () => {
    const user = await makeUser();
    const deal = await createDeal(dealInput(user.id), user.id);

    await expect(
      moveDeal(deal.id, { stage: "NOT_A_STAGE" }, user.id),
    ).rejects.toThrow();
  });

  it("throws NotFoundError for an unknown deal", async () => {
    const user = await makeUser();
    await expect(
      moveDeal("nope", { stage: "WON" }, user.id),
    ).rejects.toThrow(NotFoundError);
    await expect(deleteDeal("nope", user.id)).rejects.toThrow(NotFoundError);
  });

  it("summarises open, won and lost value correctly", async () => {
    const user = await makeUser();

    const open1 = await createDeal(
      dealInput(user.id, { value: 10000, stage: "QUALIFIED" }),
      user.id,
    );
    await createDeal(
      dealInput(user.id, { value: 5000, stage: "PROPOSAL" }),
      user.id,
    );
    const won = await createDeal(
      dealInput(user.id, { value: 20000 }),
      user.id,
    );
    const lost = await createDeal(
      dealInput(user.id, { value: 3000 }),
      user.id,
    );

    await moveDeal(won.id, { stage: "WON" }, user.id);
    await moveDeal(lost.id, { stage: "LOST" }, user.id);

    const summary = await getPipelineSummary();

    expect(summary.openValue).toBe(15000);
    expect(summary.openCount).toBe(2);
    expect(summary.wonValue).toBe(20000);
    expect(summary.wonCount).toBe(1);
    expect(summary.lostCount).toBe(1);
    // One win, one loss.
    expect(summary.winRate).toBe(50);

    expect(open1.stage).toBe("QUALIFIED");
  });

  it("returns every deal for the board, unpaged", async () => {
    const user = await makeUser();
    for (let i = 0; i < 15; i++) {
      await createDeal(
        dealInput(user.id, { title: `Deal ${i}`, company: `Company ${i}` }),
        user.id,
      );
    }

    // The list view pages at 10; the board must not.
    const board = await listBoardDeals({});
    expect(board).toHaveLength(15);

    expect(await listBoardDeals({ q: "Company 7" })).toHaveLength(1);
  });
});
