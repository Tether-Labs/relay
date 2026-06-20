import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  created_at: integer("created_at").notNull(),
});

export const magicTokens = sqliteTable("magic_tokens", {
  token: text("token").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  expires_at: integer("expires_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  expires_at: integer("expires_at").notNull(),
});

export const agentTokens = sqliteTable(
  "agent_tokens",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    token_hash: text("token_hash").notNull(),
    token_prefix: text("token_prefix").notNull(),
    created_at: integer("created_at").notNull(),
    last_used_at: integer("last_used_at"),
    revoked_at: integer("revoked_at"),
  },
  (t) => [uniqueIndex("agent_tokens_hash_idx").on(t.token_hash)],
);

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    owner_id: text("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    visibility: text("visibility").notNull().default("public"),
    entry_file: text("entry_file").notNull().default("index.html"),
    created_at: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("artifacts_slug_idx").on(t.slug)],
);

export const artifactAccess = sqliteTable("artifact_access", {
  id: text("id").primaryKey(),
  artifact_id: text("artifact_id")
    .notNull()
    .references(() => artifacts.id),
  email: text("email").notNull(),
  invited_at: integer("invited_at").notNull(),
});

export const artifactViews = sqliteTable("artifact_views", {
  id: text("id").primaryKey(),
  artifact_id: text("artifact_id")
    .notNull()
    .references(() => artifacts.id),
  viewer_hash: text("viewer_hash").notNull(),
  viewer_email: text("viewer_email"),
  viewed_at: integer("viewed_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
