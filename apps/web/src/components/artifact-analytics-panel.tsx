import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewsLineChart } from "@/components/views-line-chart";
import {
  downloadArtifactAnalyticsCsv,
  type AnalyticsPeriod,
  type ArtifactAnalytics,
} from "@/lib/api";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "all", label: "All" },
];

function formatRelative(ts: number | null | undefined) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function periodMetrics(analytics: ArtifactAnalytics, period: AnalyticsPeriod) {
  const { summary } = analytics;
  switch (period) {
    case "today":
      return {
        views: summary.viewsToday,
        unique: summary.uniqueToday,
        priorViews: null,
        priorUnique: null,
      };
    case "week":
      return {
        views: summary.viewsThisWeek,
        unique: summary.uniqueThisWeek,
        priorViews: summary.viewsLastWeek,
        priorUnique: summary.uniqueLastWeek,
      };
    default:
      return {
        views: summary.totalViews,
        unique: summary.uniqueViewers,
        priorViews: null,
        priorUnique: null,
      };
  }
}

function deltaLabel(current: number, prior: number | null) {
  if (prior === null) return null;
  const diff = current - prior;
  if (diff === 0) return "Same as last week";
  if (diff > 0) return `+${diff} vs last week`;
  return `${diff} vs last week`;
}

const RECENT_VIEWS_LIMIT = 10;

export function ArtifactAnalyticsPanel({
  slug,
  analytics,
}: {
  slug: string;
  analytics: ArtifactAnalytics;
}) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [exporting, setExporting] = useState(false);
  const metrics = periodMetrics(analytics, period);
  const { summary } = analytics;
  const hasViews = summary.totalViews > 0;
  const recentViews = analytics.recentViews.slice(0, RECENT_VIEWS_LIMIT);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadArtifactAnalyticsCsv(slug);
      toast.success("Analytics exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <CardTitle className="text-base">Analytics</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {PERIODS.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={period === value ? "default" : "outline"}
                  onClick={() => setPeriod(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button type="button" size="sm" variant="outline" disabled={exporting} onClick={exportCsv}>
              <Download />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Views" value={metrics.views} hint={deltaLabel(metrics.views, metrics.priorViews)} />
          <Metric label="Unique" value={metrics.unique} hint={deltaLabel(metrics.unique, metrics.priorUnique)} />
          <Metric
            label="Signed in"
            value={summary.authenticatedViews}
            hint={`${summary.anonymousViews} anonymous`}
          />
          <Metric
            label="Return"
            value={summary.returnViewers}
            hint={hasViews ? `${summary.totalViews} total` : "No views yet"}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Last 14 days</p>
          <ViewsLineChart data={analytics.viewsByDay} />
        </div>

        <div className="space-y-4">
          <ActivityList
            title="Recent"
            subtitle={`Last ${RECENT_VIEWS_LIMIT}`}
            items={recentViews}
            empty="No views yet."
          />
          <ActivityList
            title="Viewers"
            items={analytics.viewers.slice(0, 8).map((viewer) => ({
              label: viewer.label,
              sublabel: `${viewer.viewCount} view${viewer.viewCount === 1 ? "" : "s"}`,
              viewedAt: viewer.lastViewedAt,
            }))}
            empty="No viewers yet."
          />
        </div>

        {hasViews && (
          <p className="text-[11px] text-muted-foreground">
            First {formatRelative(summary.firstViewedAt)} · Last {formatRelative(summary.lastViewedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityList({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle?: string;
  items: { label: string; sublabel?: string; viewedAt: number }[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <p className="text-xs text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <ul className="divide-y divide-border border border-border">
        {items.map((item, i) => (
          <li
            key={`${item.label}-${item.viewedAt}-${i}`}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs"
          >
            <div className="min-w-0">
              <p className="truncate">{item.label}</p>
              {item.sublabel && <p className="text-muted-foreground">{item.sublabel}</p>}
            </div>
            <span className="shrink-0 text-muted-foreground">{formatRelative(item.viewedAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string | null }) {
  return (
    <div className="border border-border px-2.5 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
