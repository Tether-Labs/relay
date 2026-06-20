import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

describe("agent tokens", () => {
  it("creates, resolves, and revokes Relay PATs", async () => {
    vi.resetModules();
    const dir = mkdtempSync(join(tmpdir(), "relay-agent-token-"));
    process.env.DATABASE_URL = join(dir, "test.db");
    process.env.STORAGE_DIR = join(dir, "storage");

    const { migrate } = await import("../src/db/migrate.js");
    await migrate();

    const { getDb, schema } = await import("../src/db/index.js");
    await getDb().insert(schema.users).values({
      id: "user_test",
      email: "agent@example.com",
      created_at: Date.now(),
    });

    const {
      createAgentToken,
      listAgentTokens,
      revokeAgentToken,
      sessionFromAgentToken,
    } = await import("../src/lib/agent-tokens.js");

    const created = await createAgentToken("user_test", "Cursor MCP");
    expect(created.token).toMatch(/^relay_pat_/);
    expect(created.summary.tokenPrefix).not.toContain(created.token);

    await expect(sessionFromAgentToken(created.token)).resolves.toEqual({
      userId: "user_test",
      email: "agent@example.com",
    });

    const [listed] = await listAgentTokens("user_test");
    expect(listed.name).toBe("Cursor MCP");
    expect(listed.lastUsedAt).toEqual(expect.any(Number));

    await expect(revokeAgentToken("user_test", listed.id)).resolves.toBe(true);
    await expect(sessionFromAgentToken(created.token)).resolves.toBeNull();
  });
});
