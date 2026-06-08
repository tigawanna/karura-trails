import { mapTable } from "@/lib/pglite/schema/map.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import { eq } from "drizzle-orm";

const KARURA_MAP_NAME = "Karura Forest";

export async function ensureKaruraMap(db: PgliteDb): Promise<number> {
  const [existing] = await db
    .select({ id: mapTable.id })
    .from(mapTable)
    .where(eq(mapTable.name, KARURA_MAP_NAME))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(mapTable)
    .values({
      name: KARURA_MAP_NAME,
      description: "Karura Forest trail network",
      locationQuery: "Karura Forest, Nairobi",
      mapCenterLat: -1.2419,
      mapCenterLng: 36.8186,
      mapZoom: 14,
      baseMapStyle: "standard",
    })
    .returning({ id: mapTable.id });

  if (!created) {
    throw new Error("Failed to create Karura map.");
  }

  return created.id;
}
