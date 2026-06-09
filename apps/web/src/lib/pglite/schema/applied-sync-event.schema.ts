import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appliedSyncEventTable = pgTable(
  "applied_sync_event",
  {
    id: text("id").primaryKey(),
    tableName: text("table_name").notNull(),
    action: text("action").notNull(),
    appliedAt: timestamp("applied_at").defaultNow().notNull(),
    skipped: boolean("skipped").notNull().default(false),
  },
  (table) => [index("applied_sync_event_applied_at_idx").on(table.appliedAt)],
);

export type AppliedSyncEventRow = typeof appliedSyncEventTable.$inferSelect;
