import { cn } from "@/lib/utils";

/** Shimmer placeholder. Used by every route-level loading.tsx. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** A placeholder table body so loading states keep the page height stable. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-px">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4"
          style={{ opacity: 1 - i * 0.08 }}
        >
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="ml-auto h-3 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
