import { eq, and, gte, desc, count } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { artifacts, artifactViews } from "../db/schema.js";
import { getConfig } from "../config.js";

export type LeaderboardPeriod = "day" | "week" | "month";

const PERIOD_MS: Record<LeaderboardPeriod, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export type LeaderboardEntry = {
  slug: string;
  title: string;
  views: number;
  url: string;
};

export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  const since = Date.now() - PERIOD_MS[period];
  const config = getConfig();

  const rows = await db
    .select({
      slug: artifacts.slug,
      title: artifacts.title,
      views: count(artifactViews.id),
    })
    .from(artifacts)
    .innerJoin(artifactViews, eq(artifactViews.artifact_id, artifacts.id))
    .where(and(eq(artifacts.visibility, "public"), gte(artifactViews.viewed_at, since)))
    .groupBy(artifacts.id, artifacts.slug, artifacts.title)
    .orderBy(desc(count(artifactViews.id)))
    .limit(limit);

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    views: row.views,
    url: `${config.apiUrl}/a/${row.slug}`,
  }));
}
