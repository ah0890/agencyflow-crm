import { convertLead } from "@/server/services/leads";
import { created, readJson } from "@/server/http";
import { routeId, withUser, type RouteContext } from "@/server/route-helpers";

/** Turns a lead into a client (and optionally a won deal) in one transaction. */
export async function POST(request: Request, context: RouteContext) {
  return withUser(async (user) =>
    created(
      await convertLead(await routeId(context), await readJson(request), user.id),
    ),
  );
}
