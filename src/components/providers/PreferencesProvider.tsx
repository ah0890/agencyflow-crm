"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Preferences } from "@/lib/validation/schemas";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_COOKIE,
  PREFERENCES_MAX_AGE,
  serializePreferences,
} from "@/lib/preferences";

/**
 * Client-side access to the preferences the server already rendered with.
 *
 * The initial value comes from the server (read from the cookie in the root
 * layout), so there is no mount-time flash. Changing a preference updates the
 * DOM attributes immediately for instant feedback and writes the cookie so the
 * next server render agrees.
 */

type PreferencesContextValue = {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  initial,
  children,
}: {
  initial: Preferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<Preferences>(initial);

  const apply = useCallback((next: Preferences) => {
    const root = document.documentElement;
    root.dataset.theme = next.theme;
    root.dataset.accent = next.accent;
    root.dataset.density = next.density;
    document.cookie = `${PREFERENCES_COOKIE}=${serializePreferences(next)}; path=/; max-age=${PREFERENCES_MAX_AGE}; samesite=lax`;
  }, []);

  const setPreference = useCallback<PreferencesContextValue["setPreference"]>(
    (key, value) => {
      setPreferences((current) => {
        const next = { ...current, [key]: value };
        apply(next);
        return next;
      });
    },
    [apply],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    apply(DEFAULT_PREFERENCES);
  }, [apply]);

  const value = useMemo(
    () => ({ preferences, setPreference, resetPreferences }),
    [preferences, setPreference, resetPreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  }
  return context;
}
