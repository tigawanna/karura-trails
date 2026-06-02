import { sql } from "drizzle-orm/sql";
import { customType } from "drizzle-orm/sqlite-core";

/**
 * SpatiaLite stores geometries as WKB BLOBs.
 * When reading, ALWAYS use AsGeoJSON(geom) to get a JSON string
 * instead of raw BLOB (React Native has no Node.js Buffer).
 *
 * When writing, GeomFromGeoJSON converts the GeoJSON string back to WKB.
 */

export const lineStringZ = customType<{
  data: string;
}>({
  dataType() {
    return "blob";
  },
  toDriver(value) {
    return sql`SetSRID(GeomFromGeoJSON(${value}), 4326)`;
  },
});

export const pointZ = customType<{
  data: string;
}>({
  dataType() {
    return "blob";
  },
  toDriver(value) {
    return sql`SetSRID(GeomFromGeoJSON(${value}), 4326)`;
  },
});
