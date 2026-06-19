import { useEffect, useMemo, useState } from "react";
import { PublicArtifactCard } from "@/components/public-artifact-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getLeaderboard,
  type LeaderboardEntry,
  type PublicArtifactRecord,
} from "@/lib/api";

const SHOWCASE_LIMIT = 12;

function toPublicRecord(entry: LeaderboardEntry): PublicArtifactRecord {
  return {
    slug: entry.slug,
    title: entry.title,
    url: entry.url,
    created_at: 0,
    totalViews: entry.views,
    uniqueViewers: 0,
  };
}

function ShowcaseCard({ artifact }: { artifact: PublicArtifactRecord }) {
  return (
    <div className="w-72 shrink-0">
      <PublicArtifactCard artifact={artifact} truncateTitle />
    </div>
  );
}

export function ArtifactShowcase() {
  const [items, setItems] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getLeaderboard("week", SHOWCASE_LIMIT)
      .then((data) => {
        if (!cancelled) setItems(data.items);
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
  }, []);

  const marqueeItems = useMemo(() => {
    if (items.length === 0) return [];
    const repeats = items.length < 4 ? 4 : 2;
    return Array.from({ length: repeats }, () => items).flat();
  }, [items]);

  if (loading) {
    return (
      <section aria-label="Showcase" className="w-full py-8">
        <div className="mx-auto max-w-6xl px-6">
          <Skeleton className="mb-4 h-4 w-20" />
        </div>
        <div className="flex gap-4 overflow-hidden px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[15.5rem] w-72 shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  const durationSeconds = Math.max(items.length * 14, 56);

  return (
    <section aria-label="Showcase" className="w-full py-8">
      <div className="mx-auto mb-4 max-w-6xl px-6">
        <h2 className="text-sm font-medium text-foreground">Showcase</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Popular public artifacts this week</p>
      </div>

      <div className="showcase-marquee">
        <div
          className="showcase-marquee-track flex w-max gap-4 px-4"
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          {marqueeItems.map((item, index) => (
            <ShowcaseCard key={`${item.slug}-${index}`} artifact={toPublicRecord(item)} />
          ))}
        </div>
      </div>
    </section>
  );
}
