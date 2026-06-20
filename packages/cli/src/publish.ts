#!/usr/bin/env tsx
/**
 * relay publish report.html
 * Requires RELAY_TOKEN (relay_pat agent token) or ~/.relay/session
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

const apiUrl = process.env.RELAY_API_URL ?? "http://localhost:3847";
const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: npm run publish -- path/to/report.html");
  process.exit(1);
}

function getToken(): string | null {
  if (process.env.RELAY_TOKEN) return process.env.RELAY_TOKEN;
  const sessionFile = join(homedir(), ".relay", "session");
  if (existsSync(sessionFile)) return readFileSync(sessionFile, "utf8").trim();
  return null;
}

async function main() {
  const token = getToken();
  if (!token) {
    console.error(
      "Create an agent token in the Relay dashboard, then set RELAY_TOKEN or save it to ~/.relay/session",
    );
    process.exit(1);
  }

  const content = readFileSync(filePath);
  const name = basename(filePath);
  const title = process.env.RELAY_TITLE ?? name.replace(/\.html?$/i, "");

  const form = new FormData();
  form.append("title", title);
  form.append("visibility", process.env.RELAY_VISIBILITY ?? "public");
  form.append("file", new Blob([content]), name);

  const res = await fetch(`${apiUrl}/api/artifacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(data.error ?? data);
    process.exit(1);
  }

  console.log(`✓ Published: ${data.url}`);
  console.log(`  slug: ${data.slug}`);
  console.log(`  visibility: ${data.visibility}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
