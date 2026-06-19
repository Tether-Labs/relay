import { createMiddleware } from "hono/factory";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { sessions, users } from "../db/schema.js";
import { getConfig } from "../config.js";
import { verifyClerkBearer } from "../lib/clerk.js";
import type { SessionUser } from "../lib/permissions.js";

const COOKIE_NAME = "relay_session";

async function sessionFromCookie(token: string): Promise<SessionUser | null> {
  const db = getDb();
  const now = Date.now();
  const rows = await db
    .select({
      userId: sessions.user_id,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.user_id))
    .where(and(eq(sessions.token, token), gt(sessions.expires_at, now)))
    .limit(1);

  return rows[0] ?? null;
}

async function sessionFromBearer(c: { req: { header: (name: string) => string | undefined } }): Promise<SessionUser | null> {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return null;
  return verifyClerkBearer(token);
}

export const sessionMiddleware = createMiddleware<{
  Variables: { session: SessionUser | null };
}>(async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  let session: SessionUser | null = null;

  if (token) {
    session = await sessionFromCookie(token);
  }

  if (!session) {
    session = await sessionFromBearer(c);
  }

  c.set("session", session);
  await next();
});

export function requireApiSession() {
  return createMiddleware<{
    Variables: { session: SessionUser };
  }>(async (c, next) => {
    const session = c.get("session");
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });
}

export async function createSession(userId: string): Promise<string> {
  const { newToken } = await import("../lib/id.js");
  const db = getDb();
  const token = newToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await db.insert(sessions).values({
    token,
    user_id: userId,
    expires_at: expiresAt,
  });

  return token;
}

export function setSessionCookie(c: Parameters<typeof setCookie>[0], token: string) {
  const config = getConfig();
  const isProduction = process.env.NODE_ENV === "production";

  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
}

export function clearSessionCookie(c: Parameters<typeof deleteCookie>[0]) {
  const config = getConfig();
  deleteCookie(c, COOKIE_NAME, {
    path: "/",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
}

export async function destroySession(token: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.token, token));
}

export { COOKIE_NAME };
