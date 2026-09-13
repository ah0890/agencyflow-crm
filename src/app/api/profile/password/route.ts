import { changePassword } from "@/server/services/users";
import { ok, readJson } from "@/server/http";
import { withUser } from "@/server/route-helpers";

export async function POST(request: Request) {
  return withUser(async (user) =>
    ok(await changePassword(user.id, await readJson(request))),
  );
}
