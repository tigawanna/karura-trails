import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { mapTable } from "@/lib/pglite/schema/map.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MapBaseMapStyle, MapWorkspaceState } from "@/types/map/maps";
import { queryOptions } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

function toWorkspace(row: typeof mapTable.$inferSelect): MapWorkspaceState {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    locationQuery: row.locationQuery,
    mapCenterLat: row.mapCenterLat,
    mapCenterLng: row.mapCenterLng,
    mapZoom: row.mapZoom,
    baseMapStyle: row.baseMapStyle as MapBaseMapStyle,
  };
}

export async function getMapWorkspace(db: PgliteDb, mapId: number): Promise<MapWorkspaceState> {
  const [row] = await db.select().from(mapTable).where(eq(mapTable.id, mapId)).limit(1);
  if (!row) {
    throw new Error("Map not found.");
  }
  return toWorkspace(row);
}

export async function updateMapWorkspace(
  db: PgliteDb,
  mapId: number,
  patch: Partial<{
    mapCenterLat: number;
    mapCenterLng: number;
    mapZoom: number;
    baseMapStyle: MapBaseMapStyle;
    locationQuery: string;
  }>,
) {
  const [row] = await db
    .update(mapTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(mapTable.id, mapId))
    .returning();

  if (!row) {
    throw new Error("Map not found.");
  }

  return toWorkspace(row);
}

export function mapWorkspaceQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.map(mapId),
    queryFn: () => getMapWorkspace(db, mapId),
  });
}
