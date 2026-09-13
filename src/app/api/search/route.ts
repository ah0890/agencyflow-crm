import { globalSearch } from "@/server/services/search";
import { ok } from "@/server/http";
import { withUser } from "@/server/route-helpers";

/** Backs the top-bar global search dropdown. */
export async function GET(request: Request) {
  return withUser(async () => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return ok({ results: await globalSearch(q) });
  });
}
