import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every detail page: a back link, a title block with badges,
 * and a slot for actions. Keeps /leads/[id], /clients/[id] and /projects/[id]
 * visually identical without repeating the markup three times.
 */
export function DetailHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  badges,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
          {badges ? (
            <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A label/value pair inside a detail card. */
export function InfoRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-[var(--text-subtle)]">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-[var(--text)]">{children}</dd>
    </div>
  );
}

/** Small headline figure used on detail pages. */
export function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-xl font-semibold tabular-nums",
          tone === "success"
            ? "text-[var(--success-text)]"
            : tone === "warning"
              ? "text-[var(--warning-text)]"
              : "text-[var(--text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
