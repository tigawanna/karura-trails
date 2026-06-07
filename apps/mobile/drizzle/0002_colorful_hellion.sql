CREATE TABLE `point_neighbors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_point_id` integer NOT NULL,
	`to_point_id` integer NOT NULL,
	`source_id` integer,
	FOREIGN KEY (`from_point_id`) REFERENCES `points`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_point_id`) REFERENCES `points`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `point_neighbor_edge_idx` ON `point_neighbors` (`from_point_id`,`to_point_id`);--> statement-breakpoint
ALTER TABLE `points` ADD `ref` text;--> statement-breakpoint
ALTER TABLE `points` ADD `node_role` text;--> statement-breakpoint
ALTER TABLE `points` ADD `source_id` integer;--> statement-breakpoint
ALTER TABLE `points` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `points` ADD `parent_ref` text;--> statement-breakpoint
ALTER TABLE `points` ADD `metadata_json` text DEFAULT '{}';--> statement-breakpoint
CREATE UNIQUE INDEX `points_ref_unique` ON `points` (`ref`);--> statement-breakpoint
CREATE UNIQUE INDEX `points_source_id_unique` ON `points` (`source_id`);