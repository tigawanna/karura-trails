CREATE TABLE `sync_events` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`action` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`verified_at` text,
	`verified_by` text,
	`synced_at` text
);
--> statement-breakpoint
CREATE INDEX `sync_events_created_at_idx` ON `sync_events` (`id`);--> statement-breakpoint
CREATE TABLE `applied_sync_events` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`action` text NOT NULL,
	`applied_at` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `applied_sync_events_applied_at_idx` ON `applied_sync_events` (`applied_at`);
