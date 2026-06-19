import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { getConfig } from "./config.js";
import authRoute from "./routes/auth.js";
import apiRoute from "./routes/artifacts.js";
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
  }),
);
app.use(
  "/auth/*",
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : config.webUrl),
    credentials: true,
  }),
);

app.get("/", (c) => c.redirect(config.webUrl));
app.get("/health", (c) => c.json({ status: "ok", service: "relay" }));

app.route("/auth", authRoute);
app.route("/api", apiRoute);
app.route("/", viewRoute);

async function main() {
  await migrate();

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
