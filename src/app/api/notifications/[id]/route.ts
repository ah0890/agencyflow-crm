import {
  deleteNotification,
  markNotificationRead,
} from "@/server/services/notifications";
import { ok } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

export async function PATCH(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await markNotificationRead(await routeId(context), user.id)),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withUser(async (user) =>
    ok(await deleteNotification(await routeId(context), user.id)),
  );
}
