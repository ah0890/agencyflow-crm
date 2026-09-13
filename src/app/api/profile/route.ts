import { updateProfile } from "@/server/services/users";
import { ok, readJson } from "@/server/http";
import { withUser } from "@/server/route-helpers";

export async function PATCH(request: Request) {
  return withUser(async (user) =>
    ok(await updateProfile(user.id, await readJson(request))),
  );
}
