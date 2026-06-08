import { integer, pgTable, real, timestamp, varchar } from "drizzle-orm/pg-core";

export const mapTable = pgTable("map", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 1024 }),
  locationQuery: varchar("location_query", { length: 512 }),
  mapCenterLat: real("map_center_lat"),
  mapCenterLng: real("map_center_lng"),
  mapZoom: real("map_zoom"),
  baseMapStyle: varchar("base_map_style", { length: 32 }).default("standard").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MapRow = typeof mapTable.$inferSelect;
