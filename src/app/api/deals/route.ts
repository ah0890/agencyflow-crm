import { createDeal, listDeals } from "@/server/services/deals";
import { created, ok, readJson } from "@/server/http";
import { listOptions, withUser } from "@/server/route-helpers";

export async function GET(request: Request) {
  return withUser(async () => {
    const { q, sort, page, get } = listOptions(request);
    return ok(
      await listDeals({
        q,
        sort,
        page,
        stage: get("stage"),
        ownerId: get("ownerId"),
      }),
    );
  });
}

export async function POST(request: Request) {
  return withUser(async (user) =>
    created(await createDeal(await readJson(request), user.id)),
  );
}
