import { createHash, randomBytes } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { agentTokens, users } from "../db/schema.js";
import { newId } from "./id.js";
import type { SessionUser } from "./permissions.js";

const TOKEN_PREFIX = "relay_pat_";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function displayPrefix(token: string): string {
  return `${token.slice(0, 14)}...${token.slice(-4)}`;
}

export type AgentTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: number;
  lastUsedAt: number | null;
};

export function isAgentToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX);
}

export async function createAgentToken(userId: string, name: string) {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const now = Date.now();
  const row = {
    id: newId(),
    user_id: userId,
    name: name.trim() || "Agent token",
    token_hash: hashToken(token),
    token_prefix: displayPrefix(token),
    created_at: now,
  };

  await getDb().insert(agentTokens).values(row);

  return {
    token,
    summary: {
      id: row.id,
      name: row.name,
      tokenPrefix: row.token_prefix,
      createdAt: row.created_at,
      lastUsedAt: null,
    } satisfies AgentTokenSummary,
  };
}

export async function listAgentTokens(userId: string): Promise<AgentTokenSummary[]> {
  const rows = await getDb()
    .select()
    .from(agentTokens)
    .where(and(eq(agentTokens.user_id, userId), isNull(agentTokens.revoked_at)));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

export async function revokeAgentToken(userId: string, tokenId: string): Promise<boolean> {
  const result = await getDb()
    .update(agentTokens)
    .set({ revoked_at: Date.now() })
    .where(and(eq(agentTokens.id, tokenId), eq(agentTokens.user_id, userId), isNull(agentTokens.revoked_at)));

  return result.changes > 0;
}

export async function sessionFromAgentToken(token: string): Promise<SessionUser | null> {
  if (!isAgentToken(token)) return null;

  const db = getDb();
  const rows = await db
    .select({
      tokenId: agentTokens.id,
      userId: users.id,
      email: users.email,
    })
    .from(agentTokens)
    .innerJoin(users, eq(users.id, agentTokens.user_id))
    .where(and(eq(agentTokens.token_hash, hashToken(token)), isNull(agentTokens.revoked_at)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db.update(agentTokens).set({ last_used_at: Date.now() }).where(eq(agentTokens.id, row.tokenId));
  return { userId: row.userId, email: row.email };
}
