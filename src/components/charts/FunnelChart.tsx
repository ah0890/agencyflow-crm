import { ChevronDown } from "lucide-react";
import { formatPercent } from "@/lib/utils";

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
};

/**
 * Lead conversion funnel.
 *
 * The bar width carries the magnitude and the stage-to-stage percentage carries
 * the story, so every bar is the same colour - shading by value would encode
 * the same thing twice. Stage labels and counts are text, so the figure reads
 * correctly in greyscale and to a screen reader.
 */
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const top = Math.max(stages[0]?.count ?? 0, 1);

  if (stages.every((stage) => stage.count === 0)) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        No leads yet. Add one to see the funnel.
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {stages.map((stage, index) => {
        const previous = stages[index - 1];
        // Each stage is compared with the one before it. Note this is a
        // snapshot of where leads sit right now, not a cohort tracked over
        // time, so the label says "of previous stage" rather than "converted".
        const stepRate =
          previous && previous.count > 0
            ? (stage.count / previous.count) * 100
            : null;
        const widthPct = Math.max((stage.count / top) * 100, stage.count > 0 ? 8 : 3);

        return (
          <li key={stage.key}>
            {index > 0 ? (
              <div className="flex items-center gap-1.5 py-1 pl-1 text-[11px] text-[var(--text-subtle)]">
                <ChevronDown className="size-3" aria-hidden />
                {stepRate === null ? "-" : formatPercent(stepRate)} of previous
                stage
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <div
                className="flex h-9 items-center rounded-md px-3 transition-[width] duration-500"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: "var(--chart-1-soft)",
                  borderLeft: "3px solid var(--chart-1)",
                }}
              >
                <span className="truncate text-xs font-medium text-[var(--text)]">
                  {stage.label}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text)]">
                {stage.count}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
