import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql, count, max } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  artifacts,
  artifactAccess,
  artifactViews,
  users,
} from "../db/schema.js";
import { newId, newSlug } from "../lib/id.js";
import { saveHtmlFile, extractZip } from "../lib/storage.js";
import { sessionMiddleware, requireApiSession } from "../middleware/session.js";
import { getArtifactBySlug } from "../lib/permissions.js";
import { sendInviteLink, normalizeEmail } from "../lib/email.js";
import { getConfig } from "../config.js";
import type { SessionUser } from "../lib/permissions.js";

const api = new Hono<{ Variables: { session: SessionUser | null } }>();

api.use("*", sessionMiddleware);
api.use("/artifacts/*", requireApiSession());
api.use("/artifacts", requireApiSession());

api.get("/artifacts", async (c) => {
  const session = c.get("session")!;
  const db = getDb();

  const owned = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.owner_id, session.userId))
    .orderBy(desc(artifacts.created_at));

  const shared = await db
    .select({ artifact: artifacts })
    .from(artifactAccess)
    .innerJoin(artifacts, eq(artifacts.id, artifactAccess.artifact_id))
    .where(eq(artifactAccess.email, session.email));

  const ownedWithStats = await Promise.all(
    owned.map(async (a) => {
      const [stats] = await db
        .select({ totalViews: count() })
        .from(artifactViews)
        .where(eq(artifactViews.artifact_id, a.id));

      const uniqueRows = await db
        .select({ viewer_hash: artifactViews.viewer_hash })
        .from(artifactViews)
        .where(eq(artifactViews.artifact_id, a.id))
        .groupBy(artifactViews.viewer_hash);

      return {
        ...a,
        url: `${getConfig().apiUrl}/a/${a.slug}`,
        totalViews: stats?.totalViews ?? 0,
        uniqueViewers: uniqueRows.length,
      };
    }),
  );

  return c.json({
    owned: ownedWithStats,
    sharedWithMe: shared.map((s) => ({
      ...s.artifact,
      url: `${getConfig().apiUrl}/a/${s.artifact.slug}`,
    })),
  });
});

api.post("/artifacts", async (c) => {
  const session = c.get("session")!;
  const body = await c.req.parseBody();
  const title = String(body.title ?? "Untitled artifact");
  const visibility = String(body.visibility ?? "public") as "public" | "private" | "restricted";
  const file = body.file;

  if (!file || typeof file === "string") {
    return c.json({ error: "file required" }, 400);
  }

  const slug = newSlug();
  const id = newId();
  let entryFile = "index.html";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (name.endsWith(".zip")) {
      entryFile = extractZip(slug, buffer);
    } else {
      entryFile = saveHtmlFile(slug, file.name, buffer);
    }
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Upload failed" }, 400);
  }

  const db = getDb();
  await db.insert(artifacts).values({
    id,
    slug,
    owner_id: session.userId,
    title,
    visibility,
    entry_file: entryFile,
    created_at: Date.now(),
  });

  const url = `${getConfig().apiUrl}/a/${slug}`;
  return c.json({ slug, url, title, visibility }, 201);
});

api.get("/artifacts/:slug", async (c) => {
  const session = c.get("session")!;
  const artifact = await getArtifactBySlug(c.req.param("slug"));

  if (!artifact || artifact.owner_id !== session.userId) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    ...artifact,
    url: `${getConfig().apiUrl}/a/${artifact.slug}`,
  });
});

api.patch(
  "/artifacts/:slug",
  zValidator(
    "json",
    z.object({
      title: z.string().optional(),
      visibility: z.enum(["public", "private", "restricted"]).optional(),
    }),
  ),
  async (c) => {
    const session = c.get("session")!;
    const slug = c.req.param("slug");
    const artifact = await getArtifactBySlug(slug);

    if (!artifact || artifact.owner_id !== session.userId) {
      return c.json({ error: "Not found" }, 404);
    }

    const updates = c.req.valid("json");
    const db = getDb();

    if (updates.visibility === "private") {
      const invitees = await db
        .select()
        .from(artifactAccess)
        .where(eq(artifactAccess.artifact_id, artifact.id))
        .limit(1);
      if (invitees.length > 0) {
        return c.json(
          { error: "Private means owner-only. Remove invites or use Restricted for invited viewers." },
          400,
        );
      }
    }

    await db
      .update(artifacts)
      .set(updates)
      .where(eq(artifacts.id, artifact.id));

    return c.json({ ok: true, ...updates });
  },
);

api.get("/artifacts/:slug/access", async (c) => {
  const session = c.get("session")!;
  const artifact = await getArtifactBySlug(c.req.param("slug"));

  if (!artifact || artifact.owner_id !== session.userId) {
    return c.json({ error: "Not found" }, 404);
  }

  const db = getDb();
  const rows = await db
    .select({ email: artifactAccess.email, invited_at: artifactAccess.invited_at })
    .from(artifactAccess)
    .where(eq(artifactAccess.artifact_id, artifact.id))
    .orderBy(desc(artifactAccess.invited_at));

  return c.json({ emails: rows });
});

api.get("/artifacts/:slug/analytics", async (c) => {
  const session = c.get("session")!;
  const artifact = await getArtifactBySlug(c.req.param("slug"));

  if (!artifact || artifact.owner_id !== session.userId) {
    return c.json({ error: "Not found" }, 404);
  }

  const db = getDb();
  const [stats] = await db
    .select({
      totalViews: count(),
      lastViewedAt: max(artifactViews.viewed_at),
    })
    .from(artifactViews)
    .where(eq(artifactViews.artifact_id, artifact.id));

  const uniqueRows = await db
    .select({ viewer_hash: artifactViews.viewer_hash })
    .from(artifactViews)
    .where(eq(artifactViews.artifact_id, artifact.id))
    .groupBy(artifactViews.viewer_hash);

  return c.json({
    totalViews: stats?.totalViews ?? 0,
    uniqueViewers: uniqueRows.length,
    lastViewedAt: stats?.lastViewedAt ?? null,
  });
});

api.post(
  "/artifacts/:slug/invite",
  zValidator(
    "json",
    z.object({
      emails: z.array(z.string().email()).min(1),
    }),
  ),
  async (c) => {
    const session = c.get("session")!;
    const slug = c.req.param("slug");
    const artifact = await getArtifactBySlug(slug);

    if (!artifact || artifact.owner_id !== session.userId) {
      return c.json({ error: "Not found" }, 404);
    }

    const db = getDb();
    const { emails } = c.req.valid("json");
    const config = getConfig();

    for (const raw of emails) {
      const email = normalizeEmail(raw);
      const existing = await db
        .select()
        .from(artifactAccess)
        .where(and(eq(artifactAccess.artifact_id, artifact.id), eq(artifactAccess.email, email)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(artifactAccess).values({
          id: newId(),
          artifact_id: artifact.id,
          email,
          invited_at: Date.now(),
        });
      }

      const artifactUrl = `${config.apiUrl}/a/${slug}`;
      const inviteUrl = `${config.webUrl}/login?next=${encodeURIComponent(artifactUrl)}&email=${encodeURIComponent(email)}`;
      await sendInviteLink(email, artifact.title, inviteUrl);
    }

    if (artifact.visibility !== "restricted") {
      await db
        .update(artifacts)
        .set({ visibility: "restricted" })
        .where(eq(artifacts.id, artifact.id));
    }

    return c.json({ ok: true, invited: emails.length });
  },
);

export default api;
