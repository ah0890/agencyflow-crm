import { createTask, listTasks } from "@/server/services/tasks";
import { created, ok, readJson } from "@/server/http";
import { listOptions, withUser } from "@/server/route-helpers";

export async function GET(request: Request) {
  return withUser(async () => {
    const { q, sort, page, get } = listOptions(request);
    return ok(
      await listTasks({
        q,
        sort,
        page,
        status: get("status"),
        priority: get("priority"),
        projectId: get("projectId"),
        assigneeId: get("assigneeId"),
        scope: get("scope"),
      }),
    );
  });
}

export async function POST(request: Request) {
  return withUser(async (user) =>
    created(await createTask(await readJson(request), user.id)),
  );
}
