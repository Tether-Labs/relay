#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { homedir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_API_URL = "https://relay-tether-labs.fly.dev";
const SERVER_VERSION = "0.3.0";

const Visibility = z.enum(["public", "private", "restricted"]);

function getApiUrl(): string {
  return (process.env.RELAY_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

function getToken(): string | null {
  if (process.env.RELAY_TOKEN) return process.env.RELAY_TOKEN;

  const sessionFile = join(homedir(), ".relay", "session");
  if (existsSync(sessionFile)) return readFileSync(sessionFile, "utf8").trim();

  return null;
}

function requireToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error("Missing Relay auth. Set RELAY_TOKEN (relay_pat_...) or save a token to ~/.relay/session.");
  }
  return token;
}

function tokenSource(): { source: "env" | "file" | "missing"; length: number; prefix: string | null } {
  const envToken = process.env.RELAY_TOKEN;
  if (envToken) {
    return { source: "env", length: envToken.length, prefix: envToken.slice(0, 10) };
  }

  const sessionFile = join(homedir(), ".relay", "session");
  if (existsSync(sessionFile)) {
    const fileToken = readFileSync(sessionFile, "utf8").trim();
    return { source: "file", length: fileToken.length, prefix: fileToken.slice(0, 10) };
  }

  return { source: "missing", length: 0, prefix: null };
}

async function relayApi<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const token = requireToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const { json, ...rest } = init;
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Relay API failed (${res.status})`);
  }

  return data as T;
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function titleFromName(fileName: string): string {
  return basename(fileName).replace(/\.(html?|zip|md|markdown)$/i, "") || "Untitled artifact";
}

function contentTypeFor(fileName: string): string {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".zip") return "application/zip";
  if (ext === ".md" || ext === ".markdown") return "text/markdown";
  return "text/html";
}

async function publishArtifact(input: {
  filePath?: string;
  html?: string;
  markdown?: string;
  fileName?: string;
  title?: string;
  visibility?: z.infer<typeof Visibility>;
}) {
  if (!input.filePath && !input.html && !input.markdown) {
    throw new Error("Provide filePath, html, or markdown.");
  }

  const fileName = input.filePath
    ? basename(input.filePath)
    : (input.fileName ?? (input.markdown ? "artifact.md" : "artifact.html"));
  const title = input.title?.trim() || titleFromName(fileName);
  const visibility = input.visibility ?? "public";
  const bytes = input.filePath
    ? await readFile(input.filePath)
    : Buffer.from(input.markdown ?? input.html ?? "", "utf8");

  const form = new FormData();
  form.append("title", title);
  form.append("visibility", visibility);
  form.append("file", new Blob([bytes], { type: contentTypeFor(fileName) }), fileName);

  const token = requireToken();
  const res = await fetch(`${getApiUrl()}/api/artifacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Relay publish failed (${res.status})`);
  }

  return data as {
    slug: string;
    url: string;
    title: string;
    visibility: z.infer<typeof Visibility>;
  };
}

type ArtifactSummary = {
  slug: string;
  title: string;
  visibility: z.infer<typeof Visibility>;
  url: string;
  created_at: number;
  totalViews?: number;
  uniqueViewers?: number;
};

type ListArtifactsResponse = {
  owned: ArtifactSummary[];
  sharedWithMe: ArtifactSummary[];
};

type AnalyticsSummary = {
  totalViews: number;
  uniqueViewers: number;
  viewsToday: number;
  viewsThisWeek: number;
  authenticatedViews: number;
  anonymousViews: number;
  lastViewedAt: number | null;
};

type ArtifactAnalyticsResponse = {
  summary: AnalyticsSummary;
  viewsByDay: Array<{ date: string; views: number }>;
  recentViews: Array<{ label: string; viewedAt: number; authenticated: boolean }>;
  viewers: Array<{ label: string; email: string | null; viewCount: number; lastViewedAt: number }>;
  invites: Array<{ email: string; invitedAt: number; opened: boolean; viewCount: number }>;
};

function formatArtifactLine(artifact: ArtifactSummary): string {
  const views =
    artifact.totalViews !== undefined
      ? ` · ${artifact.totalViews} views · ${artifact.uniqueViewers ?? 0} unique`
      : "";
  return `- ${artifact.title} (${artifact.slug}) · ${artifact.visibility}${views}\n  ${artifact.url}`;
}

function formatAnalyticsSummary(slug: string, analytics: ArtifactAnalyticsResponse): string {
  const { summary, viewsByDay, recentViews, viewers, invites } = analytics;
  const lines = [
    `Analytics for ${slug}`,
    "",
    `Total views: ${summary.totalViews}`,
    `Unique viewers: ${summary.uniqueViewers}`,
    `Views today: ${summary.viewsToday}`,
    `Views this week: ${summary.viewsThisWeek}`,
    `Authenticated views: ${summary.authenticatedViews}`,
    `Anonymous views: ${summary.anonymousViews}`,
    summary.lastViewedAt ? `Last viewed: ${new Date(summary.lastViewedAt).toISOString()}` : "Last viewed: never",
    "",
    "Views by day (last 14 days):",
    ...(viewsByDay.length > 0
      ? viewsByDay.map((day) => `  ${day.date}: ${day.views}`)
      : ["  (none)"]),
    "",
    "Top viewers:",
    ...(viewers.length > 0
      ? viewers.slice(0, 10).map((viewer) => `  ${viewer.label}: ${viewer.viewCount} views`)
      : ["  (none)"]),
    "",
    "Recent views:",
    ...(recentViews.length > 0
      ? recentViews.slice(0, 10).map((view) => `  ${view.label} · ${new Date(view.viewedAt).toISOString()}`)
      : ["  (none)"]),
    "",
    "Invited viewers:",
    ...(invites.length > 0
      ? invites.map(
          (invite) =>
            `  ${invite.email} · ${invite.opened ? "opened" : "not opened"} · ${invite.viewCount} views`,
        )
      : ["  (none)"]),
  ];

  return lines.join("\n");
}

const server = new McpServer({
  name: "relay",
  version: SERVER_VERSION,
});

server.registerTool(
  "auth_status",
  {
    title: "Auth Status",
    description:
      "Diagnose Relay MCP authentication. Returns whether RELAY_TOKEN is set via env or ~/.relay/session, plus token length and prefix — never the full secret. Call this first when publish or list calls fail with Unauthorized.",
    inputSchema: {},
  },
  async () =>
    textResult(
      [
        `Relay auth source: ${tokenSource().source}`,
        `Token length: ${tokenSource().length}`,
        `Token prefix: ${tokenSource().prefix ?? "none"}`,
      ].join("\n"),
    ),
);

server.registerTool(
  "publish_artifact",
  {
    title: "Publish Artifact",
    description:
      "Upload and publish an HTML, Markdown, or zip artifact to Relay. Use filePath for a local .html, .htm, .md, or .zip file, html for raw HTML, or markdown for raw Markdown content. Returns the share URL, slug, title, and visibility. Defaults to public visibility.",
    inputSchema: {
      filePath: z
        .string()
        .optional()
        .describe("Absolute or relative path to a local .html, .htm, .md, .markdown, or .zip file on disk."),
      html: z.string().optional().describe("Raw HTML string to publish when no local file exists yet."),
      markdown: z.string().optional().describe("Raw Markdown string to publish when no local file exists yet."),
      fileName: z
        .string()
        .optional()
        .describe("Filename to use when publishing raw html or markdown (default: artifact.html or artifact.md)."),
      title: z.string().optional().describe("Human-readable artifact title. Defaults to the file name without extension."),
      visibility: Visibility.optional().describe(
        "Access level: public (anyone with link), private (owner only), or restricted (owner + invited emails). Default: public.",
      ),
    },
  },
  async (input) => {
    const result = await publishArtifact(input);
    return textResult(
      [
        `Published "${result.title}" to Relay.`,
        `URL: ${result.url}`,
        `Slug: ${result.slug}`,
        `Visibility: ${result.visibility}`,
      ].join("\n"),
    );
  },
);

server.registerTool(
  "list_artifacts",
  {
    title: "List Artifacts",
    description:
      "List all Relay artifacts for the authenticated user. Returns owned artifacts (with view counts) and artifacts shared with the user via invite. Use this to find slugs before analytics, permission changes, or invites.",
    inputSchema: {},
  },
  async () => {
    const data = await relayApi<ListArtifactsResponse>("/api/artifacts");

    const lines = [
      `Owned artifacts (${data.owned.length}):`,
      ...(data.owned.length > 0 ? data.owned.map(formatArtifactLine) : ["  (none)"]),
      "",
      `Shared with me (${data.sharedWithMe.length}):`,
      ...(data.sharedWithMe.length > 0 ? data.sharedWithMe.map(formatArtifactLine) : ["  (none)"]),
    ];

    return textResult(lines.join("\n"));
  },
);

server.registerTool(
  "get_artifact_analytics",
  {
    title: "Get Artifact Analytics",
    description:
      "Get view analytics for an artifact you own: total/unique views, views today and this week, authenticated vs anonymous breakdown, daily trend (14 days), top viewers, recent views, and invite open rates. Requires the artifact slug from list_artifacts or publish_artifact.",
    inputSchema: {
      slug: z.string().describe("Artifact slug identifier (e.g. abc123 from the /a/abc123 URL)."),
    },
  },
  async ({ slug }) => {
    const analytics = await relayApi<ArtifactAnalyticsResponse>(`/api/artifacts/${slug}/analytics`);
    return textResult(formatAnalyticsSummary(slug, analytics));
  },
);

server.registerTool(
  "update_artifact_permissions",
  {
    title: "Update Artifact Permissions",
    description:
      "Update an artifact's title and/or visibility. public = anyone with the link; private = owner only (fails if invitees exist — revoke them first); restricted = owner plus invited emails. Provide at least one of title or visibility.",
    inputSchema: {
      slug: z.string().describe("Artifact slug to update."),
      title: z.string().optional().describe("New display title for the artifact."),
      visibility: Visibility.optional().describe("New visibility: public, private, or restricted."),
    },
  },
  async ({ slug, title, visibility }) => {
    if (title === undefined && visibility === undefined) {
      throw new Error("Provide at least one of title or visibility.");
    }

    const body: { title?: string; visibility?: z.infer<typeof Visibility> } = {};
    if (title !== undefined) body.title = title;
    if (visibility !== undefined) body.visibility = visibility;

    const result = await relayApi<{ ok: boolean; title?: string; visibility?: z.infer<typeof Visibility> }>(
      `/api/artifacts/${slug}`,
      { method: "PATCH", json: body },
    );

    return textResult(
      [
        `Updated permissions for ${slug}.`,
        result.title ? `Title: ${result.title}` : null,
        result.visibility ? `Visibility: ${result.visibility}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
);

server.registerTool(
  "invite_artifact_viewers",
  {
    title: "Invite Artifact Viewers",
    description:
      "Invite one or more people by email to view an artifact. Sends invite emails with access links. Automatically sets visibility to restricted if not already. Use after publishing or when sharing a private report with specific recipients.",
    inputSchema: {
      slug: z.string().describe("Artifact slug to share."),
      emails: z
        .array(z.string().email())
        .min(1)
        .describe("One or more email addresses to invite as viewers."),
    },
  },
  async ({ slug, emails }) => {
    const result = await relayApi<{ ok: boolean; invited: number }>(`/api/artifacts/${slug}/invite`, {
      method: "POST",
      json: { emails },
    });

    return textResult(
      [
        `Invited ${result.invited} viewer${result.invited === 1 ? "" : "s"} to ${slug}.`,
        `Emails: ${emails.join(", ")}`,
        "Artifact visibility is restricted to owner plus invited viewers.",
      ].join("\n"),
    );
  },
);

await server.connect(new StdioServerTransport());
