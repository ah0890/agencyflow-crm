import { toggleTask } from "@/server/services/tasks";
import { ok } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

/** One-click complete / reopen from a task row checkbox. */
export async function POST(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await toggleTask(await routeId(context), user.id)),
  );
}
