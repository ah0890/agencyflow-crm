import { deleteDeal, getDeal, updateDeal } from "@/server/services/deals";
import { ok, readJson } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

export async function GET(_request: Request, context: RouteContext) {
  return withUser(async () => ok(await getDeal(await routeId(context))));
}

export async function PATCH(request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await updateDeal(await routeId(context), await readJson(request), user.id)),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await deleteDeal(await routeId(context), user.id)),
  );
}
