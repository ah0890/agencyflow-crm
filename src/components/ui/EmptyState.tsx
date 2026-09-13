import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shown whenever a list has no rows. Always offers the next action so an empty
 * screen is never a dead end.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-subtle)]">
          {icon}
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
