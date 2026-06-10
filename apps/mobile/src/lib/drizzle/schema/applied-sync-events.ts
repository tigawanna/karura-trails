import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appliedSyncEvents = sqliteTable(
  "applied_sync_events",
  {
    id: text("id").primaryKey(),
    tableName: text("table_name").notNull(),
    action: text("action").notNull(),
    appliedAt: text("applied_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    skipped: integer("skipped", { mode: "boolean" }).default(false).notNull(),
  },
  (table) => [index("applied_sync_events_applied_at_idx").on(table.appliedAt)],
);

export type AppliedSyncEventSelect = typeof appliedSyncEvents.$inferSelect;
export type AppliedSyncEventInsert = typeof appliedSyncEvents.$inferInsert;
