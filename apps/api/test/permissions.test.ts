import { describe, it, expect } from "vitest";
import { canViewArtifact } from "../src/lib/permissions.js";
import type { Artifact } from "../src/db/schema.js";

const baseArtifact: Artifact = {
  id: "art1",
  slug: "test123",
  owner_id: "owner1",
  title: "Test",
  visibility: "public",
  entry_file: "index.html",
  created_at: Date.now(),
};

describe("canViewArtifact", () => {
  it("allows public artifacts for anyone", async () => {
    expect(await canViewArtifact(baseArtifact, null, null)).toBe(true);
  });

  it("blocks private artifacts for non-owners", async () => {
    const artifact = { ...baseArtifact, visibility: "private" as const };
    expect(await canViewArtifact(artifact, null, null)).toBe(false);
    expect(
      await canViewArtifact(artifact, { userId: "owner1", email: "o@test.com" }, "o@test.com"),
    ).toBe(true);
  });

  it("blocks restricted artifacts for unauthenticated viewers", async () => {
    const artifact = { ...baseArtifact, visibility: "restricted" as const };
    expect(await canViewArtifact(artifact, null, null)).toBe(false);
  });
});
