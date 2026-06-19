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

export type User = { email: string; userId: string };

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3847").replace(/\/$/, "");

function apiPath(path: string): string {
  return `${API_URL}${path}`;
}

export function getArtifactViewUrl(slug: string): string {
  return apiPath(`/a/${slug}`);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiPath(path), {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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

export async function getMe(): Promise<User | null> {
  try {
    return await api<User>("/auth/me");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function sendMagicLink(email: string, next?: string): Promise<{ message: string }> {
  return api("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email, ...(next ? { next } : {}) }),
  });
}

export async function logout(): Promise<void> {
  await fetch(apiPath("/auth/logout"), { method: "POST", credentials: "include" });
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

export async function getArtifactAnalytics(slug: string): Promise<{
  totalViews: number;
  uniqueViewers: number;
  lastViewedAt: number | null;
}> {
  return api(`/api/artifacts/${slug}/analytics`);
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
