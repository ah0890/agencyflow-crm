import { listLeads, createLead } from "@/server/services/leads";
import { created, ok, readJson } from "@/server/http";
import { listOptions, withUser } from "@/server/route-helpers";

export async function GET(request: Request) {
  return withUser(async () => {
    const { q, sort, page, get } = listOptions(request);
    return ok(
      await listLeads({
        q,
        sort,
        page,
        status: get("status"),
        source: get("source"),
        ownerId: get("ownerId"),
      }),
    );
  });
}

export async function POST(request: Request) {
  return withUser(async (user) =>
    created(await createLead(await readJson(request), user.id)),
  );
}
