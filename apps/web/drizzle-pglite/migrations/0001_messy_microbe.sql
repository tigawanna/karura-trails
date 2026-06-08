CREATE TABLE "geo_segment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "geo_segment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"segment_group_id" varchar(128) NOT NULL,
	"segment_index" integer DEFAULT 0 NOT NULL,
	"name" varchar(255),
	"path_kind" varchar(32) DEFAULT 'unknown' NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"coordinate_space" varchar(32) DEFAULT 'wgs84' NOT NULL,
	"geometry_json" jsonb NOT NULL,
	"confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_event" (
	"id" text PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"row_id" text NOT NULL,
	"action" text NOT NULL,
	"payload_json" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"flushed" boolean DEFAULT false NOT NULL,
	"flushed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "map_landmark_type" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_landmark_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(128) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_point" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_point_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"ref" varchar(64),
	"name" varchar(255),
	"category" varchar(32) DEFAULT 'custom' NOT NULL,
	"node_role" varchar(16),
	"location" geometry(point) NOT NULL,
	"elevation" real,
	"elevation_source" varchar(32),
	"description" text,
	"parent_ref" varchar(64),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(1024),
	"location_query" varchar(512),
	"map_center_lat" real,
	"map_center_lng" real,
	"map_zoom" real,
	"base_map_style" varchar(32) DEFAULT 'standard' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marker_neighbor" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "marker_neighbor_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"from_marker_id" integer NOT NULL,
	"to_marker_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_edge" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "segment_edge_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"from_ref" varchar(64) NOT NULL,
	"to_ref" varchar(64) NOT NULL,
	"path_slug" varchar(128) NOT NULL,
	"start_fraction" real,
	"end_fraction" real,
	"geometry_json" jsonb,
	"length_m" real,
	"kind" varchar(32) DEFAULT 'unknown' NOT NULL,
	"bidirectional" boolean DEFAULT true NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail_member" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trail_member_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trail_id" integer NOT NULL,
	"segment_edge_id" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"direction" varchar(8) DEFAULT 'forward' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trail_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255),
	"kind" varchar(32) DEFAULT 'route' NOT NULL,
	"color" varchar(16),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_segment" ADD CONSTRAINT "geo_segment_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_landmark_type" ADD CONSTRAINT "map_landmark_type_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_point" ADD CONSTRAINT "map_point_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marker_neighbor" ADD CONSTRAINT "marker_neighbor_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marker_neighbor" ADD CONSTRAINT "marker_neighbor_from_marker_id_map_point_id_fk" FOREIGN KEY ("from_marker_id") REFERENCES "public"."map_point"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marker_neighbor" ADD CONSTRAINT "marker_neighbor_to_marker_id_map_point_id_fk" FOREIGN KEY ("to_marker_id") REFERENCES "public"."map_point"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_edge" ADD CONSTRAINT "segment_edge_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_member" ADD CONSTRAINT "trail_member_trail_id_trail_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."trail"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_member" ADD CONSTRAINT "trail_member_segment_edge_id_segment_edge_id_fk" FOREIGN KEY ("segment_edge_id") REFERENCES "public"."segment_edge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail" ADD CONSTRAINT "trail_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geo_segment_map_id_idx" ON "geo_segment" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "geo_segment_map_group_idx" ON "geo_segment" USING btree ("map_id","segment_group_id");--> statement-breakpoint
CREATE INDEX "local_event_flushed_idx" ON "local_event" USING btree ("flushed");--> statement-breakpoint
CREATE INDEX "local_event_created_at_idx" ON "local_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "map_landmark_type_map_id_idx" ON "map_landmark_type" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "map_landmark_type_map_slug_idx" ON "map_landmark_type" USING btree ("map_id","slug");--> statement-breakpoint
CREATE INDEX "map_point_map_id_idx" ON "map_point" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "map_point_map_ref_idx" ON "map_point" USING btree ("map_id","ref") WHERE "map_point"."ref" is not null;--> statement-breakpoint
CREATE INDEX "marker_neighbor_map_id_idx" ON "marker_neighbor" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "marker_neighbor_from_marker_id_idx" ON "marker_neighbor" USING btree ("from_marker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marker_neighbor_edge_idx" ON "marker_neighbor" USING btree ("map_id","from_marker_id","to_marker_id");--> statement-breakpoint
CREATE INDEX "segment_edge_map_id_idx" ON "segment_edge" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_edge_edge_idx" ON "segment_edge" USING btree ("map_id","from_ref","to_ref","path_slug");--> statement-breakpoint
CREATE INDEX "trail_member_trail_id_idx" ON "trail_member" USING btree ("trail_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_member_trail_order_idx" ON "trail_member" USING btree ("trail_id","order_index");--> statement-breakpoint
CREATE INDEX "trail_map_id_idx" ON "trail" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_map_slug_idx" ON "trail" USING btree ("map_id","slug");