import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const localEventTable = pgTable(
  "local_event",
  {
    id: text("id").primaryKey(),
    tableName: text("table_name").notNull(),
    rowId: text("row_id").notNull(),
    action: text("action").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    flushed: boolean("flushed").notNull().default(false),
    flushedAt: timestamp("flushed_at"),
  },
  (table) => [
    index("local_event_flushed_idx").on(table.flushed),
    index("local_event_created_at_idx").on(table.createdAt),
  ],
);

export type LocalEventRow = typeof localEventTable.$inferSelect;
