import {
  KARURA_LOCATION_QUERY,
  KARURA_MAP_NAME,
  KARURA_MAP_VIEWPORT,
} from "@/lib/map/karura-map-defaults";
import type { PgliteDb } from "@/lib/pglite/client";
import { mapTable } from "@/lib/pglite/schema/map.schema";
import { eq, ne } from "drizzle-orm";

async function consolidateToKaruraMap(db: PgliteDb, karuraMapId: number) {
  await db.delete(mapTable).where(ne(mapTable.id, karuraMapId));
}

export async function ensureKaruraMap(db: PgliteDb): Promise<number> {
  const [existing] = await db
    .select()
    .from(mapTable)
    .where(eq(mapTable.name, KARURA_MAP_NAME))
    .limit(1);

  let karuraMapId: number;

  if (existing) {
    const needsCenter =
      existing.mapCenterLat == null ||
      existing.mapCenterLng == null ||
      existing.mapZoom == null ||
      !existing.locationQuery?.trim();

    if (needsCenter) {
      await db
        .update(mapTable)
        .set({
          locationQuery: existing.locationQuery?.trim() || KARURA_LOCATION_QUERY,
          mapCenterLat: existing.mapCenterLat ?? KARURA_MAP_VIEWPORT.latitude,
          mapCenterLng: existing.mapCenterLng ?? KARURA_MAP_VIEWPORT.longitude,
          mapZoom: existing.mapZoom ?? KARURA_MAP_VIEWPORT.zoom,
          updatedAt: new Date(),
        })
        .where(eq(mapTable.id, existing.id));
    }

    karuraMapId = existing.id;
  } else {
    const [created] = await db
      .insert(mapTable)
      .values({
        name: KARURA_MAP_NAME,
        description: "Karura Forest trail network",
        locationQuery: KARURA_LOCATION_QUERY,
        mapCenterLat: KARURA_MAP_VIEWPORT.latitude,
        mapCenterLng: KARURA_MAP_VIEWPORT.longitude,
        mapZoom: KARURA_MAP_VIEWPORT.zoom,
        baseMapStyle: "standard",
      })
      .returning({ id: mapTable.id });

    if (!created) {
      throw new Error("Failed to create Karura map.");
    }

    karuraMapId = created.id;
  }

  await consolidateToKaruraMap(db, karuraMapId);

  return karuraMapId;
}
