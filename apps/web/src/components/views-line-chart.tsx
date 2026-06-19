import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  views: {
    label: "Views",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

function formatShortDate(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatChartTooltipDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ViewsLineChart({ data }: { data: { date: string; views: number }[] }) {
  const chartData = useMemo(
    () =>
      data.map((day) => ({
        date: day.date,
        views: day.views,
        label: formatShortDate(day.date),
      })),
    [data],
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[120px] w-full border border-border bg-muted/20"
      initialDimension={{ width: 360, height: 120 }}
    >
      <AreaChart accessibilityLayer data={chartData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          interval="preserveStartEnd"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const date = payload?.[0]?.payload?.date as string | undefined;
                return date ? formatChartTooltipDate(date) : "";
              }}
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">
                  {value} view{value === 1 ? "" : "s"}
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="views"
          type="monotone"
          fill="var(--color-views)"
          fillOpacity={0.15}
          stroke="var(--color-views)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
