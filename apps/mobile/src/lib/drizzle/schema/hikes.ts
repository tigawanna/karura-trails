import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { lineStringZ } from "@/lib/drizzle/spatial-types";
import { paths } from "@/lib/drizzle/schema/paths";
import { points } from "./points";

export const hikes = sqliteTable("hikes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  description: text("description"),
  plannedAt: text("planned_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  totalDistance: real("total_distance"),
  totalElevationGain: real("total_elevation_gain"),
  totalElevationLoss: real("total_elevation_loss"),
  durationSeconds: integer("duration_seconds"),
  status: text("status").notNull().default("planned"),
  geom: lineStringZ("geom"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const hikeWaypoints = sqliteTable("hike_waypoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hikeId: integer("hike_id")
    .notNull()
    .references(() => hikes.id),
  pointId: integer("point_id")
    .notNull()
    .references(() => points.id),
  sequence: integer("sequence").notNull(),
  pathId: integer("path_id").references(() => paths.id),
});

export type HikeSelect = typeof hikes.$inferSelect;
export type HikeInsert = typeof hikes.$inferInsert;
export type HikeWaypointSelect = typeof hikeWaypoints.$inferSelect;
export type HikeWaypointInsert = typeof hikeWaypoints.$inferInsert;

export type HikeStatus = "planned" | "active" | "completed" | "abandoned";
