import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { pointZ } from "@/lib/drizzle/spatial-types";
import { paths } from "@/lib/drizzle/schema/paths";

export const points = sqliteTable("points", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  description: text("description"),
  category: text("category"),
  photoUri: text("photo_uri"),
  elevation: real("elevation"),
  elevationSource: text("elevation_source"),
  nearestPathId: integer("nearest_path_id").references(() => paths.id),
  nearestPathName: text("nearest_path_name"),
  nearestPathDistance: real("nearest_path_distance"),
  geom: pointZ("geom"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type PointSelect = typeof points.$inferSelect;
export type PointInsert = typeof points.$inferInsert;

export type PointCategory =
  | "junction"
  | "gate"
  | "viewpoint"
  | "rest_area"
  | "water"
  | "cave"
  | "sign"
  | "custom";
