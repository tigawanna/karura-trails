import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import {
  markerNeighborTable,
  type MarkerNeighborRow,
} from "@/lib/pglite/schema/marker-neighbor.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import { queryOptions } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

function toRecord(row: MarkerNeighborRow): MarkerNeighborRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    fromMarkerId: row.fromMarkerId,
    toMarkerId: row.toMarkerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMarkerNeighbors(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(markerNeighborTable)
    .where(eq(markerNeighborTable.mapId, mapId));

  return rows.map(toRecord);
}

export function markerNeighborsQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.markerNeighbors(mapId),
    queryFn: () => listMarkerNeighbors(db, mapId),
  });
}
