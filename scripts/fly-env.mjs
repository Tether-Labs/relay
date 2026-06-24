import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function loadFlyApiToken() {
  if (process.env.FLY_API_TOKEN) return process.env.FLY_API_TOKEN;

  const configPath = join(homedir(), ".fly", "config.yml");
  if (!existsSync(configPath)) return null;

  const match = readFileSync(configPath, "utf8").match(/^access_token:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

export function flyProcessEnv() {
  const token = loadFlyApiToken();
  if (!token) return process.env;
  return { ...process.env, FLY_API_TOKEN: token };
}

export function requireFlyApiToken() {
  const token = loadFlyApiToken();
  if (!token) {
    throw new Error(
      "Fly not authenticated. Run `flyctl auth login` or set FLY_API_TOKEN.",
    );
  }
  return token;
}
