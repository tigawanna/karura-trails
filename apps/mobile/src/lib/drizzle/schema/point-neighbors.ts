import { integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

import { points } from "./points";

export const pointNeighbors = sqliteTable(
  "point_neighbors",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fromPointId: integer("from_point_id")
      .notNull()
      .references(() => points.id, { onDelete: "cascade" }),
    toPointId: integer("to_point_id")
      .notNull()
      .references(() => points.id, { onDelete: "cascade" }),
    sourceId: integer("source_id"),
  },
  (table) => [uniqueIndex("point_neighbor_edge_idx").on(table.fromPointId, table.toPointId)],
);

export type PointNeighborSelect = typeof pointNeighbors.$inferSelect;
export type PointNeighborInsert = typeof pointNeighbors.$inferInsert;
