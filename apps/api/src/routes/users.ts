import { Hono } from "hono";
import { eq, and, desc, count } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { artifacts, artifactViews } from "../db/schema.js";
import { getConfig } from "../config.js";
import { emailToHandle, findUserByParam } from "../lib/user-handle.js";

const usersRoute = new Hono();

usersRoute.get("/users/:handle/artifacts", async (c) => {
  const user = await findUserByParam(c.req.param("handle"));
  if (!user) return c.json({ error: "User not found" }, 404);

  const db = getDb();
  const config = getConfig();
  const rows = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.owner_id, user.id), eq(artifacts.visibility, "public")))
    .orderBy(desc(artifacts.created_at));

  const items = await Promise.all(
    rows.map(async (artifact) => {
      const [stats] = await db
        .select({ totalViews: count() })
        .from(artifactViews)
        .where(eq(artifactViews.artifact_id, artifact.id));

      const uniqueRows = await db
        .select({ viewer_hash: artifactViews.viewer_hash })
        .from(artifactViews)
        .where(eq(artifactViews.artifact_id, artifact.id))
        .groupBy(artifactViews.viewer_hash);

      return {
        slug: artifact.slug,
        title: artifact.title,
        url: `${config.apiUrl}/a/${artifact.slug}`,
        created_at: artifact.created_at,
        totalViews: stats?.totalViews ?? 0,
        uniqueViewers: uniqueRows.length,
      };
    }),
  );

  return c.json({
    user: {
      handle: emailToHandle(user.email),
      userId: user.id,
    },
    artifacts: items,
  });
});

export default usersRoute;
