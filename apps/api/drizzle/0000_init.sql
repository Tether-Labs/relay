CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

CREATE TABLE IF NOT EXISTS `magic_tokens` (
  `token` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `expires_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `sessions` (
  `token` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `expires_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `artifacts` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `owner_id` text NOT NULL REFERENCES `users`(`id`),
  `title` text NOT NULL,
  `visibility` text DEFAULT 'public' NOT NULL,
  `entry_file` text DEFAULT 'index.html' NOT NULL,
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `artifacts_slug_idx` ON `artifacts` (`slug`);

CREATE TABLE IF NOT EXISTS `artifact_access` (
  `id` text PRIMARY KEY NOT NULL,
  `artifact_id` text NOT NULL REFERENCES `artifacts`(`id`),
  `email` text NOT NULL,
  `invited_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `artifact_views` (
  `id` text PRIMARY KEY NOT NULL,
  `artifact_id` text NOT NULL REFERENCES `artifacts`(`id`),
  `viewer_hash` text NOT NULL,
  `viewer_email` text,
  `viewed_at` integer NOT NULL
);
