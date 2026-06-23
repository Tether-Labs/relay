#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { envFilePath, loadEnvFile } from "./env-from-file.mjs";

const APP = process.env.FLY_APP ?? "relay-tether-labs";
const env = loadEnvFile(envFilePath("apps/api/.env.production"));

const required = ["CLERK_SECRET_KEY", "SESSION_SECRET", "API_URL", "WEB_URL"];
for (const key of required) {
  if (!env[key]) throw new Error(`Set ${key} in apps/api/.env.production`);
}

if (env.CLERK_SECRET_KEY.startsWith("sk_test_")) {
  throw new Error("Refusing to sync: CLERK_SECRET_KEY is sk_test_... (use sk_live_...)");
}

const secrets = {
  CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
  SESSION_SECRET: env.SESSION_SECRET,
  API_URL: env.API_URL,
  WEB_URL: env.WEB_URL,
  EMAIL_FROM: env.EMAIL_FROM ?? "Relay <noreply@tether-labs.com>",
  LOG_MAGIC_LINKS: env.LOG_MAGIC_LINKS ?? "0",
};

if (env.CORS_ORIGINS) secrets.CORS_ORIGINS = env.CORS_ORIGINS;
if (env.RESEND_API_KEY) secrets.RESEND_API_KEY = env.RESEND_API_KEY;

const args = Object.entries(secrets).flatMap(([key, value]) => [`${key}=${value}`]);

console.log(`Setting Fly secrets on ${APP}...`);
const result = spawnSync("flyctl", ["secrets", "set", ...args, "--app", APP], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
