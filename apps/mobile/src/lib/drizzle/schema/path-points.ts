import { integer, real, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

import { paths } from "./paths";
import { points } from "./points";

export const pathPoints = sqliteTable(
  "path_points",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pathId: integer("path_id")
      .notNull()
      .references(() => paths.id),
    pointId: integer("point_id")
      .notNull()
      .references(() => points.id),
    positionOnPath: real("position_on_path"),
    elevationAtPath: real("elevation_at_path"),
  },
  (table) => [uniqueIndex("path_point_unique").on(table.pathId, table.pointId)],
);

export type PathPointSelect = typeof pathPoints.$inferSelect;
export type PathPointInsert = typeof pathPoints.$inferInsert;
