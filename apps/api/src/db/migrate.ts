import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "./index.js";

export async function migrate() {
  const db = getDb();
  const dir = join(import.meta.dirname, "../../drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    db.$client.exec(sql);
    console.log(`Applied migration: ${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
