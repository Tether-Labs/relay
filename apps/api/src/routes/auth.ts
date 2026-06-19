import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { getDb } from "../db/index.js";
import { users, magicTokens } from "../db/schema.js";
import { newId, newToken } from "../lib/id.js";
import { sendMagicLink, normalizeEmail } from "../lib/email.js";
import { getConfig } from "../config.js";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  sessionMiddleware,
  COOKIE_NAME,
} from "../middleware/session.js";
import type { SessionUser } from "../lib/permissions.js";

const auth = new Hono<{ Variables: { session: SessionUser | null } }>();

auth.use("*", sessionMiddleware);

function allowedRedirectOrigins(): string[] {
  const config = getConfig();
  return [config.webUrl, config.apiUrl];
}

function safeRedirectTarget(next: string | null | undefined): string {
  const config = getConfig();
  if (!next) return `${config.webUrl}/dashboard`;

  if (next.startsWith("/") && !next.startsWith("//")) {
    return `${config.webUrl}${next}`;
  }

  try {
    const url = new URL(next);
    if (allowedRedirectOrigins().includes(url.origin)) return url.toString();
  } catch {
    // fall through to dashboard
  }

  return `${config.webUrl}/dashboard`;
}

auth.post(
  "/magic-link",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      next: z.string().optional(),
    }),
  ),
  async (c) => {
    const { email: rawEmail, next } = c.req.valid("json");
    const email = normalizeEmail(rawEmail);
    const db = getDb();

    let user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: string;

    if (user[0]) {
      userId = user[0].id;
    } else {
      userId = newId();
      await db.insert(users).values({
        id: userId,
        email,
        created_at: Date.now(),
      });
    }

    const token = newToken();
    await db.insert(magicTokens).values({
      token,
      user_id: userId,
      expires_at: Date.now() + 15 * 60 * 1000,
    });

    const verifyUrl = `${getConfig().apiUrl}/auth/verify?token=${token}&next=${encodeURIComponent(safeRedirectTarget(next))}`;
    await sendMagicLink(email, verifyUrl);

    return c.json({ ok: true, message: "Check your email for a sign-in link." });
  },
);

auth.get("/verify", async (c) => {
  const token = c.req.query("token");
  const next = c.req.query("next");

  if (!token) return c.text("Missing token", 400);

  const db = getDb();
  const rows = await db.select().from(magicTokens).where(eq(magicTokens.token, token)).limit(1);
  const magic = rows[0];

  if (!magic || magic.expires_at < Date.now()) {
    return c.html(`<p>Link expired. <a href="${getConfig().webUrl}/login">Try again</a></p>`, 400);
  }

  await db.delete(magicTokens).where(eq(magicTokens.token, token));

  const sessionToken = await createSession(magic.user_id);
  setSessionCookie(c, sessionToken);

  return c.redirect(safeRedirectTarget(next));
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, COOKIE_NAME);
  if (token) await destroySession(token);
  clearSessionCookie(c);
  const accept = c.req.header("accept") ?? "";
  if (accept.includes("application/json") || c.req.header("x-requested-with")) {
    return c.json({ ok: true });
  }
  return c.redirect(getConfig().webUrl);
});

auth.get("/me", (c) => {
  const session = c.get("session");
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ email: session.email, userId: session.userId });
});

export default auth;
