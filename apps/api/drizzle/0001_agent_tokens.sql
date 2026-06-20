CREATE TABLE IF NOT EXISTS `agent_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `name` text NOT NULL,
  `token_hash` text NOT NULL,
  `token_prefix` text NOT NULL,
  `created_at` integer NOT NULL,
  `last_used_at` integer,
  `revoked_at` integer
);
CREATE UNIQUE INDEX IF NOT EXISTS `agent_tokens_hash_idx` ON `agent_tokens` (`token_hash`);
