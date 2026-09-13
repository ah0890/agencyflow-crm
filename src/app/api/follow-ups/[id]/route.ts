import { deleteFollowUp, updateFollowUp } from "@/server/services/follow-ups";
import { ok, readJson } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

export async function PATCH(request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(
      await updateFollowUp(
        await routeId(context),
        await readJson(request),
        user.id,
      ),
    ),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await deleteFollowUp(await routeId(context), user.id)),
  );
}
