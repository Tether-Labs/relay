import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq, like, or } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { users } from "../db/schema.js";
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

async function resolveEmail(
  userId: string,
  payload: Record<string, unknown>,
  preferredEmail?: string | null,
): Promise<string | null> {
  const user = await getClerkClient().users.getUser(userId);
  const addresses = user.emailAddresses.map((e) => normalizeEmail(e.emailAddress));
  if (addresses.length === 0) return null;

  if (preferredEmail) {
    const preferred = normalizeEmail(preferredEmail);
    if (addresses.includes(preferred)) return preferred;
  }

  const fromJwt = emailFromJwtClaims(payload);
  if (fromJwt) {
    const normalized = normalizeEmail(fromJwt);
    if (addresses.includes(normalized)) return normalized;
  }

  const primary = user.primaryEmailAddress?.emailAddress;
  if (primary) {
    const normalized = normalizeEmail(primary);
    if (addresses.includes(normalized)) return normalized;
  }

  return addresses[0] ?? null;
}

export async function verifyClerkBearer(
  token: string,
  preferredEmail?: string | null,
): Promise<SessionUser | null> {
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

    const email = await resolveEmail(userId, payload as Record<string, unknown>, preferredEmail);
    if (!email) return null;

    return ensureClerkUser(userId, email);
  } catch (err) {
    console.error("Clerk bearer verification failed:", err);
    return null;
  }
}

/**
 * Map Clerk sign-in to a Relay user row.
 * New users get the Clerk user id. Legacy (pre-Clerk) rows keep their existing id
 * so sessions/artifacts FKs stay valid — no destructive id migration.
 */
export async function ensureClerkUser(clerkUserId: string, email: string): Promise<SessionUser> {
  const normalized = normalizeEmail(email);
  const db = getDb();

  const byClerkId = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);
  if (byClerkId[0]) {
    if (byClerkId[0].email !== normalized) {
      await db.update(users).set({ email: normalized }).where(eq(users.id, clerkUserId));
    }
    return { userId: clerkUserId, email: normalized };
  }

  const byEmail = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (byEmail[0]) {
    return { userId: byEmail[0].id, email: normalized };
  }

  // Recover rows left by a failed id-migration attempt.
  const migrating = await db
    .select()
    .from(users)
    .where(or(eq(users.email, normalized), like(users.email, `${normalized}.migrating.%`)))
    .limit(1);
  if (migrating[0]) {
    if (migrating[0].email !== normalized) {
      await db.update(users).set({ email: normalized }).where(eq(users.id, migrating[0].id));
    }
    return { userId: migrating[0].id, email: normalized };
  }

  await db.insert(users).values({
    id: clerkUserId,
    email: normalized,
    created_at: Date.now(),
  });

  return { userId: clerkUserId, email: normalized };
}
