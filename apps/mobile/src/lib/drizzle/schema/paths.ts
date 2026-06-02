import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { lineStringZ } from "@/lib/drizzle/spatial-types";

export const paths = sqliteTable("paths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  source: text("source"),
  difficulty: text("difficulty"),
  surfaceType: text("surface_type"),
  isLoop: integer("is_loop", { mode: "boolean" }),
  distanceMeters: real("distance_meters"),
  elevationGain: real("elevation_gain"),
  elevationLoss: real("elevation_loss"),
  minElevation: real("min_elevation"),
  maxElevation: real("max_elevation"),
  vertexCount: integer("vertex_count"),
  geom: lineStringZ("geom"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type PathSelect = typeof paths.$inferSelect;
export type PathInsert = typeof paths.$inferInsert;
