CREATE TABLE "applied_sync_event" (
	"id" text PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"action" text NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "applied_sync_event_applied_at_idx" ON "applied_sync_event" USING btree ("applied_at");