import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncEvents = sqliteTable(
  "sync_events",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    tableName: text("table_name").notNull(),
    rowId: text("row_id").notNull(),
    action: text("action").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
    verified: integer("verified", { mode: "boolean" }).default(true).notNull(),
    verifiedAt: text("verified_at"),
    verifiedBy: text("verified_by"),
    syncedAt: text("synced_at"),
  },
  (table) => [index("sync_events_created_at_idx").on(table.id)],
);

export type SyncEventSelect = typeof syncEvents.$inferSelect;
export type SyncEventInsert = typeof syncEvents.$inferInsert;
