import { describe, expect, it } from "vitest";
import { createViewToken, verifyViewToken } from "../src/lib/view-token.js";

describe("view token", () => {
  it("creates and verifies a slug-bound token", () => {
    process.env.SESSION_SECRET = "test-secret-for-view-token";
    const token = createViewToken("abc12345", "user_abc");
    expect(verifyViewToken(token, "abc12345")).toEqual({
      userId: "user_abc",
      slug: "abc12345",
    });
    expect(verifyViewToken(token, "wrongslug")).toBeNull();
  });
});
