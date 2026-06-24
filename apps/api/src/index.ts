import "./load-env.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { getConfig } from "./config.js";
import authRoute from "./routes/auth.js";
import apiRoute from "./routes/artifacts.js";
import leaderboardRoute from "./routes/leaderboard.js";
import usersRoute from "./routes/users.js";
import viewRoute from "./routes/view.js";
import { migrate } from "./db/migrate.js";

const app = new Hono();

app.use("*", logger());

const config = getConfig();
const allowedOrigins = [
  config.webUrl,
  ...config.corsOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  "/api/*",
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : config.webUrl),
    credentials: true,
    allowHeaders: ["Authorization", "Content-Type", "X-Relay-Email"],
  }),
);
app.use(
  "/auth/*",
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : config.webUrl),
    credentials: true,
    allowHeaders: ["Authorization", "Content-Type", "X-Relay-Email"],
  }),
);

app.get("/", (c) => c.redirect(config.webUrl));
app.get("/health", (c) => c.json({ status: "ok", service: "relay" }));

app.route("/auth", authRoute);
app.route("/api", leaderboardRoute);
app.route("/api", usersRoute);
app.route("/api", apiRoute);
app.route("/", viewRoute);

async function main() {
  await migrate();

  if (process.env.NODE_ENV === "production" && !config.clerkSecretKey) {
    console.warn("CLERK_SECRET_KEY is not set — Clerk JWT auth will fail with 401 Unauthorized");
  }

  serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
    console.log(`Relay API at http://localhost:${info.port}`);
    console.log(`Relay web URL: ${config.webUrl}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default app;
