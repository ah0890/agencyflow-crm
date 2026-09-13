import { cn } from "@/lib/utils";

/** Project completion bar. Colour shifts as the value approaches 100%. */
export function ProgressBar({
  value,
  className,
  showLabel = false,
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    clamped >= 100
      ? "var(--success)"
      : clamped >= 60
        ? "var(--accent)"
        : clamped >= 30
          ? "var(--warning)"
          : "var(--text-subtle)";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showLabel ? (
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
          {clamped}%
        </span>
      ) : null}
    </div>
  );
}
