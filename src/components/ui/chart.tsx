"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; color?: string }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within a <ChartContainer />");
  return ctx;
}

/**
 * Publishes each config entry's colour as --color-<key> on the wrapper, so
 * chart children reference `var(--color-users)` rather than a literal hex.
 */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, v]) => v.color);
  if (!entries.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"]{${entries
          .map(([key, v]) => `--color-${key}:${v.color};`)
          .join("")}}`,
      }}
    />
  );
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          // Recessive grid and axes — the marks carry the message, not the chrome.
          "[&_.recharts-cartesian-grid_line]:stroke-border/50",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-axis-line]:stroke-border",
          "[&_.recharts-surface]:overflow-visible",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideLabel = false,
  className,
}: {
  active?: boolean;
  payload?: readonly {
    name?: string;
    dataKey?: string | number;
    value?: number | string;
    payload?: Record<string, unknown>;
  }[];
  label?: string | number;
  labelFormatter?: (label: unknown) => React.ReactNode;
  valueFormatter?: (value: number | string, key: string) => React.ReactNode;
  hideLabel?: boolean;
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-[9rem] gap-1.5 rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-md",
        className
      )}
    >
      {!hideLabel && (
        <div className="font-medium text-popover-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((item, i) => {
        const key = String(item.dataKey ?? item.name ?? i);
        const itemConfig = config[key];
        return (
          <div key={key + i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: `var(--color-${key})` }}
              />
              {/* Labels stay in text ink; the swatch beside them carries identity. */}
              <span className="text-muted-foreground">
                {itemConfig?.label ?? key}
              </span>
            </div>
            <span className="font-medium tabular-nums text-popover-foreground">
              {valueFormatter && item.value !== undefined
                ? valueFormatter(item.value, key)
                : item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle, useChart };
