CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`avatar_url` text,
	`wins` integer DEFAULT 0,
	`losses` integer DEFAULT 0,
	`total_earnings` real DEFAULT 0,
	`created_at` integer,
	`updated_at` integer
);
