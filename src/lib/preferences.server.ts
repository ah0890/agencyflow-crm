import "server-only";
import { cookies } from "next/headers";
import { PREFERENCES_COOKIE, parsePreferences } from "./preferences";
import type { Preferences } from "./validation/schemas";

/** Read preferences inside a server component (currency, density, theme). */
export async function getServerPreferences(): Promise<Preferences> {
  const cookieStore = await cookies();
  return parsePreferences(cookieStore.get(PREFERENCES_COOKIE)?.value);
}
