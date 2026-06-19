import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { getConfig } from "../config.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const config = getConfig();
    mkdirSync(dirname(config.databaseUrl), { recursive: true });
    const sqlite = new Database(config.databaseUrl);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
