import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { pointZ } from "@/lib/drizzle/spatial-types";
import { paths } from "@/lib/drizzle/schema/paths";

export const points = sqliteTable(
  "points",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ref: text("ref"),
    name: text("name"),
    description: text("description"),
    category: text("category"),
    nodeRole: text("node_role"),
    sourceId: integer("source_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    parentRef: text("parent_ref"),
    metadataJson: text("metadata_json").default("{}"),
    photoUri: text("photo_uri"),
    secondaryPhotoUri: text("secondary_photo_uri"),
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
  },
  (table) => [
    uniqueIndex("points_ref_unique").on(table.ref),
    uniqueIndex("points_source_id_unique").on(table.sourceId),
  ],
);

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

export type PointNodeRole = "junction" | "endpoint" | "waypoint";
