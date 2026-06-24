import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "../config.js";

const TTL_MS = 10 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", getConfig().sessionSecret).update(payload).digest("base64url");
}

/** Short-lived token so mobile browsers can open /a/:slug without a pre-existing API cookie. */
export function createViewToken(slug: string, userId: string): string {
  const exp = Date.now() + TTL_MS;
  const body = `${slug}:${userId}:${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyViewToken(
  token: string,
  expectedSlug: string,
): { userId: string; slug: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = sign(body);

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [slug, userId, expRaw] = body.split(":");
  const exp = Number(expRaw);
  if (!slug || !userId || !Number.isFinite(exp) || exp < Date.now()) return null;
  if (slug !== expectedSlug) return null;

  return { userId, slug };
}
