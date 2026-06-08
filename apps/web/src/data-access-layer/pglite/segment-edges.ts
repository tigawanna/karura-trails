import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { segmentEdgeTable, type SegmentEdgeRow } from "@/lib/pglite/schema/segment-edge.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";
import { queryOptions } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";

function toRecord(row: SegmentEdgeRow): SegmentEdgeRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    fromRef: row.fromRef,
    toRef: row.toRef,
    pathSlug: row.pathSlug,
    startFraction: row.startFraction,
    endFraction: row.endFraction,
    geometryJson: row.geometryJson,
    lengthM: row.lengthM,
    kind: row.kind,
    bidirectional: row.bidirectional,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSegmentEdges(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(segmentEdgeTable)
    .where(eq(segmentEdgeTable.mapId, mapId))
    .orderBy(asc(segmentEdgeTable.pathSlug), asc(segmentEdgeTable.id));

  return rows.map(toRecord);
}

export function segmentEdgesQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.segmentEdges(mapId),
    queryFn: () => listSegmentEdges(db, mapId),
  });
}
