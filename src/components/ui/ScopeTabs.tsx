"use client";

import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { cn } from "@/lib/utils";

/**
 * A row of quick-filter tabs above a list.
 *
 * These are the two or three views people actually switch between (open,
 * overdue, completed). Anything more specific belongs in the filter bar.
 */
export function ScopeTabs({
  param,
  options,
}: {
  param: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  const { get, setParams, isPending } = useQueryParams();
  const current = get(param);

  return (
    <div
      role="tablist"
      aria-label="Quick filters"
      className={cn(
        "flex gap-1 border-b border-[var(--border)] px-3 pt-3 transition-opacity",
        isPending && "opacity-60",
      )}
    >
      {options.map((option) => {
        const active = current === option.value;
        return (
          <button
            // "" (the default scope) and an explicit "all" option must not
            // collapse to the same React key.
            key={option.value || "__default"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setParams({ [param]: option.value || null })}
            className={cn(
              "-mb-px border-b-2 px-3 pb-2.5 text-sm transition-colors",
              active
                ? "border-[var(--accent)] font-medium text-[var(--text)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
