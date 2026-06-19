import { eq, and } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { artifacts, artifactAccess } from "../db/schema.js";
import type { Artifact } from "../db/schema.js";
import { normalizeEmail } from "./email.js";

export type SessionUser = { userId: string; email: string };

export async function canViewArtifact(
  artifact: Artifact,
  session: SessionUser | null,
  viewerEmail: string | null,
): Promise<boolean> {
  if (artifact.visibility === "public") return true;

  if (artifact.visibility === "private") {
    return session?.userId === artifact.owner_id;
  }

  // restricted
  if (session?.userId === artifact.owner_id) return true;
  const email = viewerEmail ? normalizeEmail(viewerEmail) : null;
  if (!email) return false;

  const db = getDb();
  const rows = await db
    .select()
    .from(artifactAccess)
    .where(and(eq(artifactAccess.artifact_id, artifact.id), eq(artifactAccess.email, email)))
    .limit(1);

  return rows.length > 0;
}

export async function getArtifactBySlug(slug: string): Promise<Artifact | undefined> {
  const db = getDb();
  const rows = await db.select().from(artifacts).where(eq(artifacts.slug, slug)).limit(1);
  return rows[0];
}
