import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { geoSegmentTable, type GeoSegmentRow } from "@/lib/pglite/schema/geo-segment.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import { queryOptions } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";

function toRecord(row: GeoSegmentRow): GeoSegmentRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    segmentGroupId: row.segmentGroupId,
    segmentIndex: row.segmentIndex,
    name: row.name,
    pathKind: row.pathKind,
    status: row.status,
    coordinateSpace: row.coordinateSpace,
    geometryJson: row.geometryJson,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGeoSegments(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId))
    .orderBy(asc(geoSegmentTable.segmentGroupId), asc(geoSegmentTable.segmentIndex));

  return rows.map(toRecord);
}

export function geoSegmentsQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.geoSegments(mapId),
    queryFn: () => listGeoSegments(db, mapId),
  });
}
