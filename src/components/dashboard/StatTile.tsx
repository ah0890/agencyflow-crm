import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const ICON_TONE: Record<Tone, string> = {
  neutral: "tone-neutral",
  info: "tone-info",
  accent: "tone-accent",
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
  violet: "tone-violet",
};

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  /** Draws attention when the hint represents a problem (overdue work). */
  alert?: boolean;
};

/**
 * A single KPI.
 *
 * When the story is one number, the number is the chart - so these are plain
 * figures rather than sparklines. Every tile links to the list it summarises,
 * which is what makes the dashboard a starting point rather than a dead end.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "accent",
  href,
  alert = false,
}: StatTileProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)]",
            ICON_TONE[tone],
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-[var(--text)]">
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "mt-1 text-xs",
            alert ? "text-[var(--danger-text)]" : "text-[var(--text-subtle)]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </>
  );

  const className =
    "block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-colors";

  return href ? (
    <Link
      href={href}
      className={cn(className, "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]")}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
