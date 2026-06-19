import { useEffect, useState } from "react";
import { ArrowSquareOut, Eye } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from "@/lib/api";
import { cn } from "@/lib/utils";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const EMPTY_COPY: Record<LeaderboardPeriod, string> = {
  day: "No public artifacts yet today.",
  week: "No public artifacts yet this week.",
  month: "No public artifacts yet this month.",
};

function LeaderboardRow({
  rank,
  entry,
  compact,
}: {
  rank: number;
  entry: LeaderboardEntry;
  compact?: boolean;
}) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group flex items-center border-t transition-colors hover:bg-muted/40",
        compact ? "h-9 gap-2 px-3" : "gap-3 px-4 py-3",
      )}
    >
      <span
        className={cn(
          "font-heading w-4 shrink-0 text-xs font-semibold tabular-nums",
          rank <= 3 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        {!compact && (
          <p className="truncate font-mono text-[11px] text-muted-foreground">/a/{entry.slug}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <Eye className="size-3" />
          {entry.views}
        </span>
        <ArrowSquareOut className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  );
}

export function PopularLinksLeaderboard({
  compact = false,
  limit,
}: {
  compact?: boolean;
  limit?: number;
}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [items, setItems] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getLeaderboard(period)
      .then((data) => {
        if (!cancelled) setItems(limit ? data.items.slice(0, limit) : data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, limit]);

  return (
    <Card className={cn(compact && "gap-0 py-0 shadow-none")}>
      <CardHeader className={cn(compact ? "px-3 py-2" : "space-y-0")}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={compact ? "text-sm" : undefined}>
            Popular public artifacts
          </CardTitle>
          <div className="flex gap-1">
            {PERIODS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={period === value ? "default" : "outline"}
                className={compact ? "h-7 px-2 text-xs" : undefined}
                onClick={() => setPeriod(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className={cn(compact ? "px-3" : "px-4 py-3")}>
            {Array.from({ length: limit ?? 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("w-full border-t", compact ? "h-9" : "mb-3 h-10")}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className={cn("text-center text-muted-foreground", compact ? "px-3 py-6 text-xs" : "px-4 py-8 text-sm")}>
            {EMPTY_COPY[period]}
          </p>
        ) : (
          <div>
            {items.map((entry, index) => (
              <LeaderboardRow key={entry.slug} rank={index + 1} entry={entry} compact={compact} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
