import { moveDeal } from "@/server/services/deals";
import { ok, readJson } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

/** Called when a Kanban card is dropped into a different column. */
export async function PATCH(request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await moveDeal(await routeId(context), await readJson(request), user.id)),
  );
}
