import { deleteTask, getTask, updateTask } from "@/server/services/tasks";
import { ok, readJson } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

export async function GET(_request: Request, context: RouteContext) {
  return withUser(async () => ok(await getTask(await routeId(context))));
}

export async function PATCH(request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await updateTask(await routeId(context), await readJson(request), user.id)),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await deleteTask(await routeId(context), user.id)),
  );
}
