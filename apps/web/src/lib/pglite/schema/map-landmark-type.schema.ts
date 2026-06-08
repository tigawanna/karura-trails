import { index, integer, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { mapTable } from "@/lib/pglite/schema/map.schema";

export const mapLandmarkTypeTable = pgTable(
  "map_landmark_type",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mapId: integer("map_id")
      .notNull()
      .references(() => mapTable.id, { onDelete: "cascade" }),
    slug: varchar({ length: 64 }).notNull(),
    label: varchar({ length: 128 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("map_landmark_type_map_id_idx").on(table.mapId),
    uniqueIndex("map_landmark_type_map_slug_idx").on(table.mapId, table.slug),
  ],
);

export type MapLandmarkTypeRow = typeof mapLandmarkTypeTable.$inferSelect;
