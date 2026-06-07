import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const landmarkTypes = sqliteTable(
  "landmark_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id"),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("landmark_types_slug_unique").on(table.slug),
    uniqueIndex("landmark_types_source_id_unique").on(table.sourceId),
  ],
);

export type LandmarkTypeSelect = typeof landmarkTypes.$inferSelect;
export type LandmarkTypeInsert = typeof landmarkTypes.$inferInsert;
