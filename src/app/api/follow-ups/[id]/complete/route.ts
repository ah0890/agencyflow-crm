import { completeFollowUp } from "@/server/services/follow-ups";
import { ok } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

/** Mark a follow-up done straight from a list row. */
export async function POST(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await completeFollowUp(await routeId(context), user.id)),
  );
}
