import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  sessionMiddleware,
  requireApiSession,
  COOKIE_NAME,
} from "../middleware/session.js";
import { createAgentToken, listAgentTokens, revokeAgentToken } from "../lib/agent-tokens.js";
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

auth.get("/agent-tokens", requireApiSession(), async (c) => {
  const session = c.get("session");
  return c.json({ tokens: await listAgentTokens(session.userId) });
});

auth.post(
  "/agent-tokens",
  requireApiSession(),
  zValidator(
    "json",
    z.object({
      name: z.string().trim().min(1).max(80).default("Agent token"),
    }),
  ),
  async (c) => {
    const session = c.get("session");
    const { name } = c.req.valid("json");
    const created = await createAgentToken(session.userId, name);
    return c.json({ token: created.token, tokenRecord: created.summary }, 201);
  },
);

auth.delete("/agent-tokens/:id", requireApiSession(), async (c) => {
  const session = c.get("session");
  const revoked = await revokeAgentToken(session.userId, c.req.param("id"));
  if (!revoked) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default auth;
