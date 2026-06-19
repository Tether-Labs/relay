import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getLeaderboard } from "../lib/leaderboard.js";

const leaderboard = new Hono();

leaderboard.get(
  "/leaderboard",
  zValidator(
    "query",
    z.object({
      period: z.enum(["day", "week", "month"]).default("week"),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    }),
  ),
  async (c) => {
    const { period, limit } = c.req.valid("query");
    const items = await getLeaderboard(period, limit);
    return c.json({ period, items });
  },
);

export default leaderboard;
