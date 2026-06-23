import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mode = process.env.NODE_ENV === "production" ? "production" : "development";

for (const file of [`.env`, `.env.local`, `.env.${mode}`, `.env.${mode}.local`]) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path, override: true });
  }
}
