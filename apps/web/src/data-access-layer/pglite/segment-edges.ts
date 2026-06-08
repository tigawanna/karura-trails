import { recordLocalEvent } from "@/data-access-layer/pglite/local-events";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { resolveMapPointLinkRef } from "@/lib/map/map-point-link-ref";
import { pathLengthMeters } from "@/lib/map/path-length";
import { mapPointTable } from "@/lib/pglite/schema/map-point.schema";
import { segmentEdgeTable, type SegmentEdgeRow } from "@/lib/pglite/schema/segment-edge.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { StoredLineStringGeometry } from "@/types/map/geo-segments";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { and, asc, eq } from "drizzle-orm";

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

async function upsertSegmentEdge(
  db: PgliteDb,
  input: {
    mapId: number;
    fromRef: string;
    toRef: string;
    pathSlug: string;
    geometryJson: StoredLineStringGeometry;
    lengthM: number;
    bidirectional?: boolean;
  },
) {
  const [existing] = await db
    .select()
    .from(segmentEdgeTable)
    .where(
      and(
        eq(segmentEdgeTable.mapId, input.mapId),
        eq(segmentEdgeTable.fromRef, input.fromRef),
        eq(segmentEdgeTable.toRef, input.toRef),
        eq(segmentEdgeTable.pathSlug, input.pathSlug),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(segmentEdgeTable)
      .set({
        geometryJson: input.geometryJson,
        lengthM: input.lengthM,
        bidirectional: input.bidirectional ?? true,
        updatedAt: new Date(),
      })
      .where(eq(segmentEdgeTable.id, existing.id))
      .returning();
    if (!row) {
      throw new Error("Failed to update segment edge.");
    }
    return toRecord(row);
  }

  const [row] = await db
    .insert(segmentEdgeTable)
    .values({
      mapId: input.mapId,
      fromRef: input.fromRef,
      toRef: input.toRef,
      pathSlug: input.pathSlug,
      geometryJson: input.geometryJson,
      lengthM: input.lengthM,
      bidirectional: input.bidirectional ?? true,
      status: "draft",
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create segment edge.");
  }
  return toRecord(row);
}

export async function createSegmentEdgeFromPoints(
  db: PgliteDb,
  input: {
    mapId: number;
    fromPointId: number;
    toPointId: number;
    pathSlug: string;
    bidirectional?: boolean;
  },
) {
  const points = await db.select().from(mapPointTable).where(eq(mapPointTable.mapId, input.mapId));
  const fromPoint = points.find((point) => point.id === input.fromPointId);
  const toPoint = points.find((point) => point.id === input.toPointId);
  if (!fromPoint || !toPoint) {
    throw new Error("Both points must exist on this map.");
  }

  const fromRef = resolveMapPointLinkRef({
    id: fromPoint.id,
    ref: fromPoint.ref,
    name: fromPoint.name,
  });
  const toRef = resolveMapPointLinkRef({
    id: toPoint.id,
    ref: toPoint.ref,
    name: toPoint.name,
  });

  const coordinates: [number, number][] = [
    [fromPoint.location.x, fromPoint.location.y],
    [toPoint.location.x, toPoint.location.y],
  ];
  const geometry: StoredLineStringGeometry = { type: "LineString", coordinates };
  const record = await upsertSegmentEdge(db, {
    mapId: input.mapId,
    fromRef,
    toRef,
    pathSlug: input.pathSlug.trim() || "manual-segments",
    geometryJson: geometry,
    lengthM: pathLengthMeters(coordinates),
    bidirectional: input.bidirectional,
  });

  await recordLocalEvent(db, {
    tableName: "segment_edge",
    rowId: String(record.id),
    action: "create",
    payload: record as unknown as Record<string, unknown>,
  });

  return record;
}

export async function createSegmentEdgeChainFromPoints(
  db: PgliteDb,
  input: { mapId: number; pointIds: number[]; pathSlug: string; bidirectional?: boolean },
) {
  if (input.pointIds.length < 2) {
    throw new Error("Add at least two markers to the chain.");
  }

  const segments: SegmentEdgeRecord[] = [];
  for (let index = 0; index < input.pointIds.length - 1; index += 1) {
    const fromPointId = input.pointIds[index];
    const toPointId = input.pointIds[index + 1];
    if (fromPointId === undefined || toPointId === undefined) {
      continue;
    }
    const segment = await createSegmentEdgeFromPoints(db, {
      mapId: input.mapId,
      fromPointId,
      toPointId,
      pathSlug: input.pathSlug,
      bidirectional: input.bidirectional,
    });
    segments.push(segment);
  }

  return { segments };
}

export function createSegmentEdgeChainMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: { pointIds: number[]; pathSlug: string }) =>
      createSegmentEdgeChainFromPoints(db, { mapId, ...input }),
  });
}
