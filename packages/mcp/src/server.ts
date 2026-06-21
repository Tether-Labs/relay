#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { homedir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_API_URL = "https://relay-tether-labs.fly.dev";

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

function titleFromName(fileName: string): string {
  return basename(fileName).replace(/\.(html?|zip)$/i, "") || "Untitled artifact";
}

function contentTypeFor(fileName: string): string {
  return extname(fileName).toLowerCase() === ".zip" ? "application/zip" : "text/html";
}

async function publishArtifact(input: {
  filePath?: string;
  html?: string;
  fileName?: string;
  title?: string;
  visibility?: z.infer<typeof Visibility>;
}) {
  const token = getToken();
  if (!token) {
    throw new Error("Missing Relay auth. Set RELAY_TOKEN or save a Clerk session JWT to ~/.relay/session.");
  }

  if (!input.filePath && !input.html) {
    throw new Error("Provide either filePath or html.");
  }

  const fileName = input.filePath ? basename(input.filePath) : (input.fileName ?? "artifact.html");
  const title = input.title?.trim() || titleFromName(fileName);
  const visibility = input.visibility ?? "public";
  const bytes = input.filePath
    ? await readFile(input.filePath)
    : Buffer.from(input.html ?? "", "utf8");

  const form = new FormData();
  form.append("title", title);
  form.append("visibility", visibility);
  form.append("file", new Blob([bytes], { type: contentTypeFor(fileName) }), fileName);

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

const server = new McpServer({
  name: "relay",
  version: "0.1.0",
});

server.registerTool(
  "publish_artifact",
  {
    title: "Publish Artifact",
    description: "Publish a local HTML/zip file or raw HTML content to Relay and return the share URL.",
    inputSchema: {
      filePath: z.string().optional().describe("Path to a local .html, .htm, or .zip file."),
      html: z.string().optional().describe("Raw HTML content to publish when no file exists yet."),
      fileName: z.string().optional().describe("File name to use when publishing raw HTML."),
      title: z.string().optional().describe("Artifact title. Defaults to the file name."),
      visibility: Visibility.optional().describe("Access level. Defaults to public."),
    },
  },
  async (input) => {
    const result = await publishArtifact(input);

    return {
      content: [
        {
          type: "text",
          text: [
            `Published "${result.title}" to Relay.`,
            `URL: ${result.url}`,
            `Slug: ${result.slug}`,
            `Visibility: ${result.visibility}`,
          ].join("\n"),
        },
      ],
    };
  },
);

await server.connect(new StdioServerTransport());
