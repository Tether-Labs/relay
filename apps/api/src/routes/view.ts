import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { artifactViews, users } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { readArtifactFile } from "../lib/storage.js";
import { isMarkdownFilename } from "../lib/artifact-files.js";
import { renderMarkdownDocument } from "../lib/markdown.js";
import { canViewArtifact, getArtifactBySlug } from "../lib/permissions.js";
import type { SessionUser } from "../lib/permissions.js";
import { createSession, sessionMiddleware, setSessionCookie } from "../middleware/session.js";
import { viewerHash } from "../lib/email.js";
import { webLoginForArtifactUrl } from "../lib/artifact-links.js";
import { verifyViewToken } from "../lib/view-token.js";
import { getConfig } from "../config.js";
import { layout } from "../views/templates.js";

const view = new Hono<{ Variables: { session: SessionUser | null } }>();

view.use("*", sessionMiddleware);

async function resolveViewSession(c: Context, slug: string): Promise<SessionUser | null> {
  const existing = c.get("session");
  if (existing) return existing;

  const viewToken = c.req.query("view_token");
  if (!viewToken) return null;

  const claims = verifyViewToken(viewToken, slug);
  if (!claims) return null;

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, claims.userId)).limit(1);
  if (!user) return null;

  const session: SessionUser = { userId: user.id, email: user.email };
  const sessionToken = await createSession(user.id);
  setSessionCookie(c, sessionToken);
  return session;
}

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

function loginUrl(slug: string, email?: string | null): string {
  return webLoginForArtifactUrl(getConfig().webUrl, slug, email ?? undefined);
}

function accessDeniedHtml(slug: string, session: SessionUser | null): string {
  const login = loginUrl(slug);
  const signedInNote = session
    ? `<p>Signed in as <strong>${session.email}</strong>. This invite may be tied to a different email — sign out and try again.</p>`
    : `<p><a href="${login}">Sign in</a> with an invited email.</p>`;
  return layout(
    "Access restricted",
    `<h1>Access restricted</h1><p>This experience is only visible to invited viewers.</p>${signedInNote}`,
  );
}

function denyArtifactView(
  c: { html: (body: string, status?: number) => Response; redirect: (url: string) => Response },
  slug: string,
  session: SessionUser | null,
): Response {
  if (!session) {
    return c.redirect(loginUrl(slug));
  }
  return c.html(accessDeniedHtml(slug, session), 403);
}

view.get("/a/:slug", async (c) => {
  const slug = c.req.param("slug");
  const artifact = await getArtifactBySlug(slug);

  if (!artifact) return c.text("Experience not found", 404);

  const session = await resolveViewSession(c, slug);
  const allowed = await canViewArtifact(artifact, session, session?.email ?? null);

  if (!allowed) {
    return denyArtifactView(c, slug, session);
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

  const session = await resolveViewSession(c, slug);
  const allowed = await canViewArtifact(artifact, session, session?.email ?? null);
  if (!allowed) return denyArtifactView(c, slug, session);

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
