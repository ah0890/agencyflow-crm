import { createProject, listProjects } from "@/server/services/projects";
import { created, ok, readJson } from "@/server/http";
import { listOptions, withUser } from "@/server/route-helpers";

export async function GET(request: Request) {
  return withUser(async () => {
    const { q, sort, page, get } = listOptions(request);
    return ok(
      await listProjects({
        q,
        sort,
        page,
        status: get("status"),
        clientId: get("clientId"),
        priority: get("priority"),
        managerId: get("managerId"),
      }),
    );
  });
}

export async function POST(request: Request) {
  return withUser(async (user) =>
    created(await createProject(await readJson(request), user.id)),
  );
}
