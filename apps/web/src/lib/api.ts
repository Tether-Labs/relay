export type ArtifactRecord = {
  id: string;
  slug: string;
  title: string;
  visibility: "public" | "private" | "restricted";
  url: string;
  created_at: number;
  entry_file?: string;
  totalViews?: number;
  uniqueViewers?: number;
  lastViewedAt?: number | null;
};

export type ArtifactAccess = {
  email: string;
  invited_at: number;
};

export type LeaderboardPeriod = "day" | "week" | "month";

export type LeaderboardEntry = {
  slug: string;
  title: string;
  views: number;
  url: string;
};

export type User = { email: string; userId: string };

export type AgentTokenRecord = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: number;
  lastUsedAt: number | null;
};

export type PublicArtifactRecord = {
  slug: string;
  title: string;
  url: string;
  created_at: number;
  totalViews: number;
  uniqueViewers: number;
};

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

export type PublicUserProfile = {
  user: { handle: string; userId: string };
  artifacts: PublicArtifactRecord[];
};

export function emailToHandle(email: string): string {
  const at = email.indexOf("@");
  return (at === -1 ? email : email.slice(0, at)).toLowerCase();
}

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3847").replace(/\/$/, "");

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

function apiPath(path: string): string {
  return `${API_URL}${path}`;
}

export function getArtifactViewUrl(slug: string): string {
  return apiPath(`/a/${slug}`);
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!authTokenGetter) return {};

  for (let attempt = 0; attempt < 20; attempt++) {
    const token = await authTokenGetter();
    if (token) return { Authorization: `Bearer ${token}` };
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return {};
}

/** Wait until Clerk has issued a session token, then sync the API cookie. */
export async function ensureApiAuth(): Promise<void> {
  const headers = await authHeaders();
  if (!headers.Authorization) throw new AuthError();
  await syncApiSession();
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiPath(path), {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(await authHeaders()),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    throw new AuthError();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

/** Sync Clerk session to API cookie so /a/:slug links work on the API origin. */
export async function syncApiSession(): Promise<void> {
  const res = await fetch(apiPath("/auth/sync"), {
    method: "POST",
    credentials: "include",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new AuthError();
  }
}

export async function getMe(): Promise<User | null> {
  try {
    return await api<User>("/auth/me");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function logout(): Promise<void> {
  await fetch(apiPath("/auth/logout"), {
    method: "POST",
    credentials: "include",
    headers: await authHeaders(),
  });
}

export async function listAgentTokens(): Promise<{ tokens: AgentTokenRecord[] }> {
  return api("/auth/agent-tokens");
}

export async function createAgentToken(name: string): Promise<{
  token: string;
  tokenRecord: AgentTokenRecord;
}> {
  return api("/auth/agent-tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeAgentToken(id: string): Promise<{ ok: boolean }> {
  return api(`/auth/agent-tokens/${id}`, {
    method: "DELETE",
  });
}

export async function listArtifacts(): Promise<{
  owned: ArtifactRecord[];
  sharedWithMe: ArtifactRecord[];
}> {
  return api("/api/artifacts");
}

export async function getArtifact(slug: string): Promise<ArtifactRecord> {
  return api(`/api/artifacts/${slug}`);
}

export async function getArtifactAnalytics(slug: string): Promise<ArtifactAnalytics> {
  return api(`/api/artifacts/${slug}/analytics`);
}

export async function downloadArtifactAnalyticsCsv(slug: string): Promise<void> {
  const res = await fetch(apiPath(`/api/artifacts/${slug}/analytics/export`), {
    credentials: "include",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}-analytics.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getArtifactAccess(slug: string): Promise<{ emails: ArtifactAccess[] }> {
  return api(`/api/artifacts/${slug}/access`);
}

export async function updateArtifact(
  slug: string,
  data: { title?: string; visibility?: ArtifactRecord["visibility"] },
): Promise<{ ok: boolean }> {
  return api(`/api/artifacts/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function inviteToArtifact(slug: string, emails: string[]): Promise<{ ok: boolean; invited: number }> {
  return api(`/api/artifacts/${slug}/invite`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
}

export async function revokeArtifactAccess(slug: string, email: string): Promise<{ ok: boolean }> {
  return api(`/api/artifacts/${slug}/access`, {
    method: "DELETE",
    body: JSON.stringify({ email }),
  });
}

export async function publishArtifact(
  file: File,
  title: string,
  visibility: ArtifactRecord["visibility"],
): Promise<ArtifactRecord> {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("visibility", visibility);
  return api("/api/artifacts", { method: "POST", body: form });
}

export async function getLeaderboard(
  period: LeaderboardPeriod = "week",
  limit?: number,
): Promise<{ period: LeaderboardPeriod; items: LeaderboardEntry[] }> {
  const params = new URLSearchParams({ period });
  if (limit != null) params.set("limit", String(limit));
  const res = await fetch(apiPath(`/api/leaderboard?${params}`));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getUserPublicArtifacts(handle: string): Promise<PublicUserProfile> {
  const res = await fetch(apiPath(`/api/users/${encodeURIComponent(handle)}/artifacts`));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
