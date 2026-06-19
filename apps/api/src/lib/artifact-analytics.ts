import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { artifactViews, type Artifact } from "../db/schema.js";
import { normalizeEmail } from "./email.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

export type AnalyticsPeriod = "today" | "week" | "all";

export type ArtifactAnalytics = {
  summary: {
    totalViews: number;
    uniqueViewers: number;
    firstViewedAt: number | null;
    lastViewedAt: number | null;
    viewsToday: number;
    viewsThisWeek: number;
    viewsLastWeek: number;
    uniqueToday: number;
    uniqueThisWeek: number;
    uniqueLastWeek: number;
    authenticatedViews: number;
    anonymousViews: number;
    returnViewers: number;
    publishedAt: number;
    daysSincePublish: number;
  };
  viewsByDay: { date: string; views: number }[];
  recentViews: { label: string; viewedAt: number; authenticated: boolean }[];
  viewers: {
    label: string;
    email: string | null;
    viewCount: number;
    firstViewedAt: number;
    lastViewedAt: number;
  }[];
  invites: {
    email: string;
    invitedAt: number;
    opened: boolean;
    viewCount: number;
    lastViewedAt: number | null;
  }[];
};

type ViewRow = {
  viewer_hash: string;
  viewer_email: string | null;
  viewed_at: number;
};

function startOfUtcDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function utcDayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function uniqueHashesInRange(views: ViewRow[], since: number, until = Date.now()): number {
  const hashes = new Set<string>();
  for (const view of views) {
    if (view.viewed_at >= since && view.viewed_at < until) hashes.add(view.viewer_hash);
  }
  return hashes.size;
}

function viewsInRange(views: ViewRow[], since: number, until = Date.now()): number {
  let count = 0;
  for (const view of views) {
    if (view.viewed_at >= since && view.viewed_at < until) count++;
  }
  return count;
}

function buildViewsByDay(views: ViewRow[], now: number): { date: string; views: number }[] {
  const todayStart = startOfUtcDay(now);
  const buckets = new Map<string, number>();

  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    buckets.set(utcDayKey(todayStart - i * DAY_MS), 0);
  }

  for (const view of views) {
    const key = utcDayKey(view.viewed_at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, views: count }));
}

function buildViewerRollup(views: ViewRow[]) {
  const byHash = new Map<
    string,
    { email: string | null; viewCount: number; firstViewedAt: number; lastViewedAt: number }
  >();

  for (const view of views) {
    const existing = byHash.get(view.viewer_hash);
    if (!existing) {
      byHash.set(view.viewer_hash, {
        email: view.viewer_email,
        viewCount: 1,
        firstViewedAt: view.viewed_at,
        lastViewedAt: view.viewed_at,
      });
      continue;
    }
    existing.viewCount++;
    if (view.viewed_at < existing.firstViewedAt) existing.firstViewedAt = view.viewed_at;
    if (view.viewed_at > existing.lastViewedAt) existing.lastViewedAt = view.viewed_at;
    if (view.viewer_email) existing.email = view.viewer_email;
  }

  return [...byHash.values()]
    .map((viewer) => ({
      label: viewer.email ?? "Anonymous",
      email: viewer.email,
      viewCount: viewer.viewCount,
      firstViewedAt: viewer.firstViewedAt,
      lastViewedAt: viewer.lastViewedAt,
    }))
    .sort((a, b) => b.lastViewedAt - a.lastViewedAt);
}

function buildInviteStatus(
  invites: { email: string; invited_at: number }[],
  views: ViewRow[],
): ArtifactAnalytics["invites"] {
  const viewsByEmail = new Map<string, ViewRow[]>();
  for (const view of views) {
    if (!view.viewer_email) continue;
    const email = normalizeEmail(view.viewer_email);
    const list = viewsByEmail.get(email) ?? [];
    list.push(view);
    viewsByEmail.set(email, list);
  }

  return invites.map((invite) => {
    const email = normalizeEmail(invite.email);
    const matched = viewsByEmail.get(email) ?? [];
    const lastViewedAt =
      matched.length > 0 ? Math.max(...matched.map((v) => v.viewed_at)) : null;
    return {
      email: invite.email,
      invitedAt: invite.invited_at,
      opened: matched.length > 0,
      viewCount: matched.length,
      lastViewedAt,
    };
  });
}

export async function getArtifactAnalytics(
  artifact: Artifact,
  invites: { email: string; invited_at: number }[],
): Promise<ArtifactAnalytics> {
  const db = getDb();
  const views = await db
    .select({
      viewer_hash: artifactViews.viewer_hash,
      viewer_email: artifactViews.viewer_email,
      viewed_at: artifactViews.viewed_at,
    })
    .from(artifactViews)
    .where(eq(artifactViews.artifact_id, artifact.id))
    .orderBy(desc(artifactViews.viewed_at));

  const now = Date.now();
  const todayStart = startOfUtcDay(now);
  const weekStart = now - 7 * DAY_MS;
  const lastWeekStart = now - 14 * DAY_MS;

  const viewerRollup = buildViewerRollup(views);
  const returnViewers = viewerRollup.filter((v) => v.viewCount > 1).length;
  const authenticatedViews = views.filter((v) => v.viewer_email).length;

  const firstViewedAt = views.length > 0 ? views[views.length - 1]!.viewed_at : null;
  const lastViewedAt = views.length > 0 ? views[0]!.viewed_at : null;
  const daysSincePublish = Math.max(
    1,
    Math.ceil((now - artifact.created_at) / DAY_MS),
  );

  return {
    summary: {
      totalViews: views.length,
      uniqueViewers: viewerRollup.length,
      firstViewedAt,
      lastViewedAt,
      viewsToday: viewsInRange(views, todayStart),
      viewsThisWeek: viewsInRange(views, weekStart),
      viewsLastWeek: viewsInRange(views, lastWeekStart, weekStart),
      uniqueToday: uniqueHashesInRange(views, todayStart),
      uniqueThisWeek: uniqueHashesInRange(views, weekStart),
      uniqueLastWeek: uniqueHashesInRange(views, lastWeekStart, weekStart),
      authenticatedViews,
      anonymousViews: views.length - authenticatedViews,
      returnViewers,
      publishedAt: artifact.created_at,
      daysSincePublish,
    },
    viewsByDay: buildViewsByDay(views, now),
    recentViews: views.slice(0, 10).map((view) => ({
      label: view.viewer_email ?? "Anonymous",
      viewedAt: view.viewed_at,
      authenticated: Boolean(view.viewer_email),
    })),
    viewers: viewerRollup,
    invites: buildInviteStatus(invites, views),
  };
}

export function artifactAnalyticsToCsv(
  artifactTitle: string,
  views: ViewRow[],
): string {
  const lines = ["viewed_at,viewer,authenticated"];
  for (const view of views) {
    const viewer = view.viewer_email ?? "Anonymous";
    const authenticated = view.viewer_email ? "yes" : "no";
    lines.push(`${new Date(view.viewed_at).toISOString()},${viewer},${authenticated}`);
  }
  return `artifact,${artifactTitle}\n${lines.join("\n")}\n`;
}

export async function getArtifactViewRows(artifactId: string): Promise<ViewRow[]> {
  const db = getDb();
  return db
    .select({
      viewer_hash: artifactViews.viewer_hash,
      viewer_email: artifactViews.viewer_email,
      viewed_at: artifactViews.viewed_at,
    })
    .from(artifactViews)
    .where(eq(artifactViews.artifact_id, artifactId))
    .orderBy(desc(artifactViews.viewed_at));
}
