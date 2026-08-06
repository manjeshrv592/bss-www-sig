"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Every chart here shows a single series, so identity is never carried by
// colour: no legend is needed and one hue is used throughout.
const seriesConfig = {
  value: { label: "Users", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Horizontal bar — comparing magnitude across named categories. */
export function CategoryBarChart({
  data,
  label,
  valueLabel = "Users",
}: {
  data: { name: string; value: number }[];
  label?: string;
  valueLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {label ?? "No data yet"}
      </p>
    );
  }

  const config = {
    value: { label: valueLabel, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 32, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={110}
          tickMargin={6}
        />
        <XAxis dataKey="value" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent valueFormatter={(v) => `${v}`} />}
        />
        {/* 4px rounded data-end, square against the baseline. */}
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} barSize={18}>
          {/* Direct labels: the value is readable without hovering. */}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Area over time — a single trend, so one hue and no legend. */
export function ActivityAreaChart({
  data,
}: {
  data: { date: string; value: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No activity recorded in the last 14 days
      </p>
    );
  }

  return (
    <ChartContainer config={seriesConfig} className="aspect-auto h-[200px] w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
      >
        <defs>
          <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
          tickMargin={4}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              valueFormatter={(v) => `${v} action${v === 1 ? "" : "s"}`}
            />
          }
        />
        <Area
          dataKey="value"
          name="Actions"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="url(#fillActivity)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/**
 * Coverage meters — each row is one ratio against a total, which is a meter
 * rather than a chart. The track is the same hue as the fill.
 */
export function CoverageMeters({
  rows,
  total,
}: {
  rows: { label: string; filled: number }[];
  total: number;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const pct = total === 0 ? 0 : Math.round((row.filled / total) * 100);
        return (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="tabular-nums">
                <span className="font-medium">{row.filled}</span>
                <span className="text-muted-foreground">
                  {" "}/ {total} · {pct}%
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--chart-1)]/15">
              <div
                className="h-full rounded-full bg-[var(--chart-1)]"
                style={{ width: `${pct}%` }}
                role="meter"
                aria-valuenow={row.filled}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${row.label}: ${row.filled} of ${total}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
