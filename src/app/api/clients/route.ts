import { createClient, listClients } from "@/server/services/clients";
import { created, ok, readJson } from "@/server/http";
import { listOptions, withUser } from "@/server/route-helpers";

export async function GET(request: Request) {
  return withUser(async () => {
    const { q, sort, page, get } = listOptions(request);
    return ok(
      await listClients({
        q,
        sort,
        page,
        status: get("status"),
        accountManagerId: get("accountManagerId"),
      }),
    );
  });
}

export async function POST(request: Request) {
  return withUser(async (user) =>
    created(await createClient(await readJson(request), user.id)),
  );
}
