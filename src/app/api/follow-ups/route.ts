import { createFollowUp, listFollowUps } from "@/server/services/follow-ups";
import { created, ok, readJson } from "@/server/http";
import { listOptions, withUser } from "@/server/route-helpers";

export async function GET(request: Request) {
  return withUser(async () => {
    const { q, page, get } = listOptions(request);
    return ok(
      await listFollowUps({
        q,
        page,
        type: get("type"),
        ownerId: get("ownerId"),
        scope: get("scope"),
      }),
    );
  });
}

export async function POST(request: Request) {
  return withUser(async (user) =>
    created(await createFollowUp(await readJson(request), user.id)),
  );
}
