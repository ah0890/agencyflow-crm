"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

/** Page controls for every list view. Hidden when everything fits on one page. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
}: PaginationProps) {
  const { setParams, isPending } = useQueryParams();

  if (pageCount <= 1) {
    return (
      <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-subtle)]">
        {total} {total === 1 ? "record" : "records"}
      </div>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Window the page buttons so long lists do not produce 40 links.
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3"
    >
      <p className="text-xs text-[var(--text-subtle)]">
        Showing <span className="text-[var(--text-muted)]">{from}</span>-
        <span className="text-[var(--text-muted)]">{to}</span> of{" "}
        <span className="text-[var(--text-muted)]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setParams({ page: page - 1 })}
          disabled={page <= 1 || isPending}
          aria-label="Previous page"
          className="flex size-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setParams({ page: p })}
            disabled={isPending}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "size-8 rounded-md text-xs font-medium tabular-nums transition-colors",
              p === page
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
            )}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setParams({ page: page + 1 })}
          disabled={page >= pageCount || isPending}
          aria-label="Next page"
          className="flex size-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
