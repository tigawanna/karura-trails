CREATE TABLE `landmark_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landmark_types_slug_unique` ON `landmark_types` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `landmark_types_source_id_unique` ON `landmark_types` (`source_id`);
