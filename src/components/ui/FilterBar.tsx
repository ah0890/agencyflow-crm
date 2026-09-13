"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { cn } from "@/lib/utils";

export type FilterDef = {
  /** URL parameter name. */
  key: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
};

type FilterBarProps = {
  searchPlaceholder?: string;
  filters?: FilterDef[];
  sortOptions?: ReadonlyArray<{ value: string; label: string }>;
};

/**
 * Search + filter + sort controls for a list page. Everything writes to the
 * URL, which is what the server component reads to build its query.
 */
export function FilterBar({
  searchPlaceholder = "Search...",
  filters = [],
  sortOptions,
}: FilterBarProps) {
  const { get, setParams, reset, isPending } = useQueryParams();
  const urlTerm = get("q");

  const [term, setTerm] = useState(urlTerm);

  // When the URL changes from elsewhere (Clear, a link, the back button) the
  // input follows it. Adjusting during render is React's recommended way to
  // derive state from props - an effect here would render the stale value once.
  const [renderedUrlTerm, setRenderedUrlTerm] = useState(urlTerm);
  if (urlTerm !== renderedUrlTerm) {
    setRenderedUrlTerm(urlTerm);
    setTerm(urlTerm);
  }

  // Debounce so typing does not fire a server round-trip per keystroke.
  useEffect(() => {
    if (term === urlTerm) return;
    const timeout = setTimeout(() => setParams({ q: term || null }), 350);
    return () => clearTimeout(timeout);
  }, [term, urlTerm, setParams]);

  const activeCount =
    filters.filter((f) => get(f.key)).length + (urlTerm ? 1 : 0);

  const selectClass =
    "h-9 cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 pr-8 text-xs text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-3 transition-opacity",
        isPending && "opacity-60",
      )}
    >
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {filters.map((filter) => (
        <select
          key={filter.key}
          value={get(filter.key)}
          onChange={(e) => setParams({ [filter.key]: e.target.value || null })}
          aria-label={filter.label}
          className={selectClass}
        >
          <option value="">{filter.label}: All</option>
          {filter.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {sortOptions ? (
        <select
          value={get("sort")}
          onChange={(e) => setParams({ sort: e.target.value || null })}
          aria-label="Sort by"
          className={selectClass}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      ) : null}

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-1 rounded-[var(--radius)] px-2.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <X className="size-3.5" />
          Clear
        </button>
      ) : null}
    </div>
  );
}
