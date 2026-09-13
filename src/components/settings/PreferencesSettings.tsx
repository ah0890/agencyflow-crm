"use client";

import { Check, Moon, Rows2, Rows3, Sun } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CheckboxInput, SelectInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { cn } from "@/lib/utils";

const ACCENTS = [
  { value: "indigo", label: "Indigo", swatch: "#6366f1" },
  { value: "cyan", label: "Cyan", swatch: "#06b6d4" },
  { value: "violet", label: "Violet", swatch: "#8b5cf6" },
  { value: "emerald", label: "Emerald", swatch: "#10b981" },
] as const;

const CURRENCIES = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "PKR", label: "Pakistani Rupee (PKR)" },
  { value: "AED", label: "UAE Dirham (AED)" },
] as const;

/**
 * Appearance and CRM preferences.
 *
 * These write to a cookie rather than the database (see lib/preferences.ts),
 * which is what lets the server render the correct theme on the first byte and
 * format money in the chosen currency without a round trip.
 *
 * Every control here changes the live UI immediately - nothing on this screen
 * is decorative.
 */
export function PreferencesSettings() {
  const { preferences, setPreference, resetPreferences } = usePreferences();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Appearance"
          description="AgencyFlow is designed dark-first. Light is fully supported."
        />
        <CardBody className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
              Theme
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "dark", label: "Dark", icon: Moon },
                { value: "light", label: "Light", icon: Sun },
              ].map((option) => {
                const active = preferences.theme === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setPreference("theme", option.value as "dark" | "light")
                    }
                    aria-pressed={active}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-[var(--radius)] border px-4 text-sm transition-colors",
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
              Accent colour
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((accent) => {
                const active = preferences.accent === accent.value;
                return (
                  <button
                    key={accent.value}
                    type="button"
                    onClick={() => setPreference("accent", accent.value)}
                    aria-pressed={active}
                    aria-label={`${accent.label} accent`}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-[var(--radius)] border px-3 text-sm transition-colors",
                      active
                        ? "border-[var(--accent)] text-[var(--text)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <span
                      className="flex size-4 items-center justify-center rounded-full"
                      style={{ backgroundColor: accent.swatch }}
                    >
                      {active ? (
                        <Check className="size-2.5 text-white" />
                      ) : null}
                    </span>
                    {accent.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--text-subtle)]">
              Charts keep their own validated palette so data stays readable
              whichever accent you pick.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
              Table density
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "comfortable", label: "Comfortable", icon: Rows2 },
                { value: "compact", label: "Compact", icon: Rows3 },
              ].map((option) => {
                const active = preferences.density === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setPreference(
                        "density",
                        option.value as "comfortable" | "compact",
                      )
                    }
                    aria-pressed={active}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-[var(--radius)] border px-4 text-sm transition-colors",
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="CRM preferences"
          description="How figures are displayed across the app."
        />
        <CardBody className="space-y-5">
          <SelectInput
            label="Currency"
            className="max-w-sm"
            options={[...CURRENCIES]}
            value={preferences.currency}
            onChange={(e) =>
              setPreference(
                "currency",
                e.target.value as (typeof CURRENCIES)[number]["value"],
              )
            }
            hint="Applies to every amount in the app, including charts."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Notifications"
          description="Which alerts appear in the bell menu."
        />
        <CardBody className="space-y-4">
          <CheckboxInput
            label="Follow-ups due soon"
            description="Anything due in the next 48 hours."
            checked={preferences.notifyFollowUps}
            onChange={(e) =>
              setPreference("notifyFollowUps", e.target.checked)
            }
          />
          <CheckboxInput
            label="Overdue tasks"
            description="Tasks assigned to you that have passed their due date."
            checked={preferences.notifyOverdueTasks}
            onChange={(e) =>
              setPreference("notifyOverdueTasks", e.target.checked)
            }
          />
          <CheckboxInput
            label="Project deadlines"
            description="Active projects due within the week."
            checked={preferences.notifyDeadlines}
            onChange={(e) =>
              setPreference("notifyDeadlines", e.target.checked)
            }
          />

          <div className="border-t border-[var(--border)] pt-4">
            <Button variant="secondary" onClick={resetPreferences}>
              Reset all preferences
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
