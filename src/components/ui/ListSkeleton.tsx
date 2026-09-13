import { Card } from "./Card";
import { Skeleton, SkeletonTable } from "./Skeleton";

/**
 * Route-level loading UI for list pages.
 *
 * Mirrors the real layout (header, filter bar, rows) so the page does not jump
 * when the data arrives.
 */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-28 rounded-[var(--radius)]" />
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] px-5 py-3">
          <Skeleton className="h-9 w-full max-w-xs rounded-[var(--radius)]" />
          <Skeleton className="h-9 w-28 rounded-[var(--radius)]" />
          <Skeleton className="h-9 w-28 rounded-[var(--radius)]" />
        </div>
        <SkeletonTable rows={rows} />
      </Card>
    </>
  );
}
