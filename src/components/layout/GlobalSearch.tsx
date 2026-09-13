"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { SearchResult } from "@/server/services/search";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  lead: "Lead",
  client: "Client",
  project: "Project",
  deal: "Deal",
  task: "Task",
};

const TYPE_TONE: Record<SearchResult["type"], string> = {
  lead: "tone-info",
  client: "tone-success",
  project: "tone-accent",
  deal: "tone-violet",
  task: "tone-warning",
};

/**
 * Global search.
 *
 * Queries are debounced and sent to /api/search, which fans out across the five
 * entity types. Arrow keys move through results and Enter opens the highlighted
 * one, so the whole thing is usable without touching the mouse. Cmd/Ctrl+K
 * focuses it from anywhere.
 */
export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // Cmd/Ctrl+K from anywhere in the app.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close when clicking outside.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const query = term.trim();
    // Below two characters there is nothing worth querying. Stale results are
    // hidden by `showResults` below rather than cleared here, which keeps this
    // effect free of synchronous state updates.
    if (query.length < 2) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      // The spinner starts when the request does, not on every keystroke.
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { results: SearchResult[] };
        setResults(data.results);
        setHighlighted(0);
        setOpen(true);
      } catch {
        // Aborted by the next keystroke; nothing to report.
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [term]);

  // Only show the dropdown once the query is long enough to have been sent.
  const showResults = open && term.trim().length >= 2;

  function go(result: SearchResult) {
    setOpen(false);
    setTerm("");
    router.push(result.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showResults || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[highlighted];
      if (result) go(result);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showResults}
        aria-controls="global-search-results"
        aria-label="Search leads, clients, projects, deals and tasks"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search everything..."
        className="h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-12 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] transition-colors hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="size-3.5 animate-spin text-[var(--text-subtle)]" />
        ) : (
          <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 font-sans text-[10px] text-[var(--text-subtle)] sm:block">
            Ctrl K
          </kbd>
        )}
      </span>

      {showResults ? (
        <div
          id="global-search-results"
          role="listbox"
          className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-lg)]"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No matches for{" "}
              <span className="text-[var(--text)]">{term}</span>
            </p>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                role="option"
                aria-selected={index === highlighted}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => go(result)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  index === highlighted && "bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    TYPE_TONE[result.type],
                  )}
                >
                  {TYPE_LABELS[result.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-[var(--text)]">
                    {result.title}
                  </span>
                  <span className="block truncate text-xs text-[var(--text-subtle)]">
                    {result.subtitle}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
