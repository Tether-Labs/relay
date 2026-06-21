import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { artifactViews } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { readArtifactFile } from "../lib/storage.js";
import { isMarkdownFilename } from "../lib/artifact-files.js";
import { renderMarkdownDocument } from "../lib/markdown.js";
import { canViewArtifact, getArtifactBySlug } from "../lib/permissions.js";
import type { SessionUser } from "../lib/permissions.js";
import { sessionMiddleware } from "../middleware/session.js";
import { viewerHash } from "../lib/email.js";
import { getConfig } from "../config.js";
import { layout } from "../views/templates.js";

const view = new Hono<{ Variables: { session: SessionUser | null } }>();

view.use("*", sessionMiddleware);

function footer(): string {
  const config = getConfig();
  return `
<div id="relay-powered-by" style="position:fixed;bottom:0;left:0;right:0;padding:10px 16px;background:rgba(15,15,20,0.92);color:#a1a1aa;font:13px/1.4 system-ui,sans-serif;text-align:center;border-top:1px solid rgba(255,255,255,0.08);z-index:99999;">
  Powered by <a href="https://www.tether-labs.com/projects/relay" style="color:#fafafa;text-decoration:none;font-weight:600;">Relay</a>
  · <a href="${config.webUrl}" style="color:#818cf8;text-decoration:none;">Share your own AI experience →</a>
</div>`;
}

function injectFooter(html: string): string {
  if (getConfig().hideFooter) return html;
  const poweredBy = footer();
  if (html.includes("</body>")) {
    return html.replace("</body>", `${poweredBy}</body>`);
  }
  return html + poweredBy;
}

async function recordView(
  artifactId: string,
  session: { email: string } | null,
  fingerprint: string,
) {
  const db = getDb();
  await db.insert(artifactViews).values({
    id: newId(),
    artifact_id: artifactId,
    viewer_hash: viewerHash(session?.email ?? null, fingerprint),
    viewer_email: session?.email ?? null,
    viewed_at: Date.now(),
  });
}

function loginUrl(slug: string): string {
  const config = getConfig();
  const artifactUrl = `${config.apiUrl}/a/${slug}`;
  return `${config.webUrl}/login?next=${encodeURIComponent(artifactUrl)}`;
}

view.get("/a/:slug", async (c) => {
  const slug = c.req.param("slug");
  const artifact = await getArtifactBySlug(slug);

  if (!artifact) return c.text("Experience not found", 404);

  const session = c.get("session");
  const allowed = await canViewArtifact(artifact, session, session?.email ?? null);

  if (!allowed) {
    if (artifact.visibility === "private" || artifact.visibility === "restricted") {
      return c.redirect(loginUrl(slug));
    }
    return c.html(
      layout(
        "Access restricted",
        `<h1>Access restricted</h1><p>This experience is only visible to invited viewers.</p><p><a href="${loginUrl(slug)}">Sign in</a> with an invited email.</p>`,
      ),
      403,
    );
  }

  const file = readArtifactFile(slug, artifact.entry_file);
  if (!file) return c.text("Experience file missing", 500);

  const fingerprint = c.req.header("x-forwarded-for") ?? c.req.header("user-agent") ?? "anon";
  await recordView(artifact.id, session, fingerprint);

  const source = file.toString("utf8");
  const rendered = isMarkdownFilename(artifact.entry_file)
    ? renderMarkdownDocument(artifact.title, source)
    : source;
  return c.html(injectFooter(rendered));
});

view.get("/a/:slug/*", async (c) => {
  const slug = c.req.param("slug");
  const filePath = c.req.path.replace(`/a/${slug}/`, "");
  const artifact = await getArtifactBySlug(slug);

  if (!artifact) return c.text("Not found", 404);

  const session = c.get("session");
  const allowed = await canViewArtifact(artifact, session, session?.email ?? null);
  if (!allowed) return c.redirect(loginUrl(slug));

  const file = readArtifactFile(slug, filePath);
  if (!file) return c.text("Not found", 404);

  const ext = filePath.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    css: "text/css",
    js: "application/javascript",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    gif: "image/gif",
    woff2: "font/woff2",
  };

  const body = new Uint8Array(file.byteLength);
  body.set(file);
  return c.body(body, 200, {
    "Content-Type": types[ext ?? ""] ?? "application/octet-stream",
  });
});

export default view;
