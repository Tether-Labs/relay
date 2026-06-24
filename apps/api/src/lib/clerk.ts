import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { users, sessions, agentTokens, artifacts, magicTokens } from "../db/schema.js";
import { getConfig } from "../config.js";
import { normalizeEmail } from "./email.js";
import type { SessionUser } from "./permissions.js";

function getClerkClient() {
  const secretKey = getConfig().clerkSecretKey;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not configured");
  return createClerkClient({ secretKey });
}

function emailFromJwtClaims(payload: Record<string, unknown>): string | null {
  for (const key of ["email", "primary_email", "primaryEmail"]) {
    const value = payload[key];
    if (typeof value === "string" && value.includes("@")) return value;
  }
  return null;
}

async function resolveEmail(userId: string, payload: Record<string, unknown>): Promise<string | null> {
  const fromJwt = emailFromJwtClaims(payload);
  if (fromJwt) return fromJwt;

  const user = await getClerkClient().users.getUser(userId);
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

async function migrateUserId(oldId: string, newId: string, email: string, createdAt: number): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ id: newId, email, created_at: createdAt });
    await tx.update(sessions).set({ user_id: newId }).where(eq(sessions.user_id, oldId));
    await tx.update(agentTokens).set({ user_id: newId }).where(eq(agentTokens.user_id, oldId));
    await tx.update(artifacts).set({ owner_id: newId }).where(eq(artifacts.owner_id, oldId));
    await tx.update(magicTokens).set({ user_id: newId }).where(eq(magicTokens.user_id, oldId));
    await tx.delete(users).where(eq(users.id, oldId));
  });
}

export async function verifyClerkBearer(token: string): Promise<SessionUser | null> {
  const config = getConfig();
  if (!config.clerkSecretKey) return null;

  try {
    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
      authorizedParties: [
        config.webUrl,
        ...config.corsOrigins,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ],
    });

    const userId = payload.sub;
    if (!userId) return null;

    const email = await resolveEmail(userId, payload as Record<string, unknown>);
    if (!email) return null;

    return ensureClerkUser(userId, email);
  } catch (err) {
    console.error("Clerk bearer verification failed:", err);
    return null;
  }
}

export async function ensureClerkUser(userId: string, email: string): Promise<SessionUser> {
  const normalized = normalizeEmail(email);
  const db = getDb();

  const byId = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (byId[0]) {
    if (byId[0].email !== normalized) {
      await db.update(users).set({ email: normalized }).where(eq(users.id, userId));
    }
    return { userId, email: normalized };
  }

  const byEmail = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (byEmail[0]) {
    if (byEmail[0].id !== userId) {
      await migrateUserId(byEmail[0].id, userId, normalized, byEmail[0].created_at);
    }
    return { userId, email: normalized };
  }

  await db.insert(users).values({
    id: userId,
    email: normalized,
    created_at: Date.now(),
  });

  return { userId, email: normalized };
}
