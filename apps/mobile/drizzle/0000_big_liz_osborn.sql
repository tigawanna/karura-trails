CREATE TABLE `hike_waypoints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hike_id` integer NOT NULL,
	`point_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`path_id` integer,
	FOREIGN KEY (`hike_id`) REFERENCES `hikes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`point_id`) REFERENCES `points`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`path_id`) REFERENCES `paths`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hikes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`description` text,
	`planned_at` text,
	`started_at` text,
	`completed_at` text,
	`total_distance` real,
	`total_elevation_gain` real,
	`total_elevation_loss` real,
	`duration_seconds` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`geom` blob,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `path_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path_id` integer NOT NULL,
	`point_id` integer NOT NULL,
	`position_on_path` real,
	`elevation_at_path` real,
	FOREIGN KEY (`path_id`) REFERENCES `paths`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`point_id`) REFERENCES `points`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `path_point_unique` ON `path_points` (`path_id`,`point_id`);--> statement-breakpoint
CREATE TABLE `paths` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source` text,
	`difficulty` text,
	`surface_type` text,
	`is_loop` integer,
	`distance_meters` real,
	`elevation_gain` real,
	`elevation_loss` real,
	`min_elevation` real,
	`max_elevation` real,
	`vertex_count` integer,
	`geom` blob,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paths_slug_unique` ON `paths` (`slug`);--> statement-breakpoint
CREATE TABLE `points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`description` text,
	`category` text,
	`photo_uri` text,
	`elevation` real,
	`elevation_source` text,
	`nearest_path_id` integer,
	`nearest_path_name` text,
	`nearest_path_distance` real,
	`geom` blob,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`nearest_path_id`) REFERENCES `paths`(`id`) ON UPDATE no action ON DELETE no action
);
