import { cn } from "@/lib/utils";

export type BarListItem = {
  key: string;
  label: string;
  value: number;
  /** Optional secondary figure shown to the right of the count. */
  meta?: string;
};

/**
 * Horizontal bar list.
 *
 * Built from plain HTML rather than a charting library on purpose: labels and
 * values are real text, so the chart doubles as its own table view, nothing can
 * clip, and it costs no JavaScript.
 *
 * One series means one colour - the bar length already encodes magnitude, so
 * shading each bar by its own value would spend the colour channel on
 * information the chart is already showing.
 */
export function BarList({
  items,
  valueFormatter = (v) => v.toLocaleString("en-US"),
  emptyMessage = "No data yet.",
  className,
}: {
  items: BarListItem[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        {emptyMessage}
      </p>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-[var(--text-muted)]">
              {item.label}
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              {item.meta ? (
                <span className="text-xs text-[var(--text-subtle)]">
                  {item.meta}
                </span>
              ) : null}
              <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                {valueFormatter(item.value)}
              </span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
                backgroundColor: "var(--chart-1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
