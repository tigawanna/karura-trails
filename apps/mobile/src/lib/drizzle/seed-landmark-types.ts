import { SUGGESTED_LANDMARK_TYPES } from "@/geo/landmark-type-records";
import type { RoutingGraphSeedJson } from "@/geo/routing-graph-seed.types";
import type { DrizzleDB } from "./client";
import { landmarkTypes } from "./schema";
import { count } from "drizzle-orm";

export async function seedLandmarkTypesFromJson(
  database: DrizzleDB,
  seed: RoutingGraphSeedJson,
): Promise<number> {
  const [{ total }] = await database.select({ total: count() }).from(landmarkTypes);
  if (total > 0) {
    return total;
  }

  const entries =
    seed.landmarkTypes && seed.landmarkTypes.length > 0
      ? seed.landmarkTypes.map((entry) => ({
          sourceId: entry.id,
          slug: entry.slug,
          label: entry.label,
          sortOrder: entry.sortOrder,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }))
      : SUGGESTED_LANDMARK_TYPES.map((entry, index) => ({
          sourceId: null,
          slug: entry.slug,
          label: entry.label,
          sortOrder: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

  await database.insert(landmarkTypes).values(entries);
  return entries.length;
}
