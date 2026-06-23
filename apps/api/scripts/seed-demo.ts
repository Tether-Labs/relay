/**
 * Seeds the Product Hunt demo artifact at /a/demo
 * Run: npm run seed:demo
 */
import "../src/load-env.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { migrate } from "../src/db/migrate.js";
import { getDb } from "../src/db/index.js";
import { users, artifacts } from "../src/db/schema.js";
import { newId } from "../src/lib/id.js";
import { artifactDir } from "../src/lib/storage.js";
import { getConfig } from "../src/config.js";
import { eq } from "drizzle-orm";

const DEMO_SLUG = "demo";
const DEMO_EMAIL = "demo@relay.local";
const DEMO_TITLE = "Relay — Share AI experiences securely";

async function main() {
  await migrate();
  const db = getDb();
  const config = getConfig();

  // Primary demo: meta experience (you experience the product while reading about it)
  const htmlPath = join(import.meta.dirname, "../../../demo/relay-product-demo.html");
  const html = readFileSync(htmlPath);
  mkdirSync(artifactDir(DEMO_SLUG), { recursive: true });
  writeFileSync(join(config.storageDir, DEMO_SLUG, "index.html"), html);

  const existing = await db.select().from(artifacts).where(eq(artifacts.slug, DEMO_SLUG)).limit(1);

  if (existing[0]) {
    await db
      .update(artifacts)
      .set({ title: DEMO_TITLE, entry_file: "index.html" })
      .where(eq(artifacts.id, existing[0].id));
    console.log(`✓ Demo updated: ${config.apiUrl}/a/${DEMO_SLUG}`);
  } else {
    let user = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
    let userId = user[0]?.id;
    if (!userId) {
      userId = newId();
      await db.insert(users).values({ id: userId, email: DEMO_EMAIL, created_at: Date.now() });
    }

    await db.insert(artifacts).values({
      id: newId(),
      slug: DEMO_SLUG,
      owner_id: userId,
      title: DEMO_TITLE,
      visibility: "public",
      entry_file: "index.html",
      created_at: Date.now(),
    });
    console.log(`✓ Demo artifact: ${config.apiUrl}/a/${DEMO_SLUG}`);
  }

  console.log(`  Also try: npm run publish -- demo/month-end-financial-report.html`);
  console.log(`  Tagline: "Built this weekend. Share AI-generated experiences securely."`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
