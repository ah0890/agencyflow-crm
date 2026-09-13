import { preferencesSchema, type Preferences } from "@/lib/validation/schemas";

/**
 * Appearance and CRM preferences.
 *
 * These live in a plain (non-httpOnly) cookie rather than localStorage for two
 * reasons:
 *   1. the server can read them, so <html> is rendered with the right theme
 *      attributes on the first byte - no theme flash and no blocking script;
 *   2. server components can format money in the chosen currency.
 *
 * There is nothing sensitive here, so a readable cookie is the right tool. The
 * session cookie is separate and httpOnly (see lib/auth/session.ts).
 */

export const PREFERENCES_COOKIE = "agencyflow_prefs";
export const PREFERENCES_MAX_AGE = 60 * 60 * 24 * 365;

export const DEFAULT_PREFERENCES: Preferences = preferencesSchema.parse({});

/** Parse a cookie value, falling back to defaults on anything unexpected. */
export function parsePreferences(raw: string | undefined): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function serializePreferences(preferences: Preferences): string {
  return encodeURIComponent(JSON.stringify(preferences));
}
