import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { ensureClerkUser } from "../src/lib/clerk.js";
import { migrate } from "../src/db/migrate.js";

describe("ensureClerkUser", () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = ":memory:";
    await migrate();
  });

  it("reuses legacy user id when email already exists", async () => {
    const db = getDb();
    await db.insert(users).values({
      id: "legacy_nanoid_123",
      email: "friend@example.com",
      created_at: Date.now(),
    });

    const session = await ensureClerkUser("user_clerk_new_id", "friend@example.com");
    expect(session.userId).toBe("legacy_nanoid_123");

    const rows = await db.select().from(users).where(eq(users.email, "friend@example.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("legacy_nanoid_123");
  });

  it("creates a new row with the Clerk id for first-time users", async () => {
    const session = await ensureClerkUser("user_clerk_brand_new", "new@example.com");
    expect(session.userId).toBe("user_clerk_brand_new");
  });
});
