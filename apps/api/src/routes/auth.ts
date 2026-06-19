import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  sessionMiddleware,
  requireApiSession,
  COOKIE_NAME,
} from "../middleware/session.js";
import type { SessionUser } from "../lib/permissions.js";

const auth = new Hono<{ Variables: { session: SessionUser | null } }>();

auth.use("*", sessionMiddleware);

/** Bridge Clerk JWT → API session cookie (for /a/:slug viewing on the API origin). */
auth.post("/sync", requireApiSession(), async (c) => {
  const session = c.get("session");
  const sessionToken = await createSession(session.userId);
  setSessionCookie(c, sessionToken);
  return c.json({ ok: true, email: session.email, userId: session.userId });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, COOKIE_NAME);
  if (token) await destroySession(token);
  clearSessionCookie(c);
  const accept = c.req.header("accept") ?? "";
  if (accept.includes("application/json") || c.req.header("x-requested-with")) {
    return c.json({ ok: true });
  }
  return c.text("Signed out", 200);
});

auth.get("/me", (c) => {
  const session = c.get("session");
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ email: session.email, userId: session.userId });
});

export default auth;
