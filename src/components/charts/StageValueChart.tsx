"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export type StagePoint = {
  key: string;
  label: string;
  count: number;
  value: number;
};

/**
 * Open pipeline value by stage.
 *
 * A single series, so a single colour, with the closing stages dimmed only
 * where they are not part of the open pipeline. Deal counts ride in the
 * tooltip instead of on a second axis.
 */
export function StageValueChart({
  data,
  currency = "USD",
  height = 260,
}: {
  data: StagePoint[];
  currency?: string;
  height?: number;
}) {
  const empty = data.every((point) => point.value === 0);

  return (
    <div style={{ height }}>
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
          No deals in the pipeline yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value: number) =>
                formatCurrency(value, { currency, compact: true })
              }
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={<StageTooltip currency={currency} />}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {data.map((point) => (
                <Cell
                  key={point.key}
                  fill={
                    point.key === "WON" ? "var(--chart-1-soft)" : "var(--chart-1)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: StagePoint }>;
  currency: string;
};

function StageTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-xs font-medium text-[var(--text)]">{point.label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">
        {formatCurrency(point.value, { currency })}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {point.count} {point.count === 1 ? "deal" : "deals"}
      </p>
    </div>
  );
}
