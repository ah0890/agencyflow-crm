import {
  deleteProject,
  getProject,
  updateProject,
} from "@/server/services/projects";
import { ok, readJson } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

export async function GET(_request: Request, context: RouteContext) {
  return withUser(async () => ok(await getProject(await routeId(context))));
}

export async function PATCH(request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(
      await updateProject(await routeId(context), await readJson(request), user.id),
    ),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await deleteProject(await routeId(context), user.id)),
  );
}
