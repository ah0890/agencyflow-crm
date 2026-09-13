"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export type TrendPoint = {
  key: string;
  label: string;
  revenue: number;
  deals: number;
};

/**
 * Monthly closed-won revenue.
 *
 * One measure on one axis. Deal count travels in the tooltip rather than on a
 * second y-axis: two scales on one plot invent a relationship that is not in
 * the data.
 */
export function TrendChart({
  data,
  currency = "USD",
  height = 260,
}: {
  data: TrendPoint[];
  currency?: string;
  height?: number;
}) {
  const empty = data.every((point) => point.revenue === 0);

  return (
    <div style={{ height }}>
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
          No closed-won revenue in this period yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="af-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
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
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              content={<TrendTooltip currency={currency} />}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#af-revenue)"
              activeDot={{
                r: 4,
                stroke: "var(--surface)",
                strokeWidth: 2,
                fill: "var(--chart-1)",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
  currency: string;
};

function TrendTooltip({ active, payload, currency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-xs font-medium text-[var(--text)]">{point.label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">
        {formatCurrency(point.revenue, { currency })}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {point.deals} {point.deals === 1 ? "deal" : "deals"} closed
      </p>
    </div>
  );
}
