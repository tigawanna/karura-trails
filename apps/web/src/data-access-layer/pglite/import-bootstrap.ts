import { createGeoSegment } from "@/data-access-layer/pglite/geo-segments";
import { recordLocalEvent } from "@/data-access-layer/pglite/local-events";
import { createMapPoint, listMapPoints } from "@/data-access-layer/pglite/map-points";
import { geoSegmentTable } from "@/lib/pglite/schema/geo-segment.schema";
import { markerNeighborTable } from "@/lib/pglite/schema/marker-neighbor.schema";
import { segmentEdgeTable } from "@/lib/pglite/schema/segment-edge.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MapBootstrapExport } from "@/features/map/lib/export-bootstrap";
import type { MapPointCategory } from "@/types/map/map-points";
import { and, eq } from "drizzle-orm";

export type ImportBootstrapResult = {
  mapPointsCreated: number;
  mapPointsSkipped: number;
  markerNeighborsCreated: number;
  geoSegmentsCreated: number;
  geoSegmentsSkipped: number;
  segmentEdgesCreated: number;
  segmentEdgesUpdated: number;
};

function resolveImportRef(ref: string | null, exportId: number): string {
  const trimmed = ref?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `import-${exportId}`;
}

export async function importMapBootstrap(
  db: PgliteDb,
  mapId: number,
  payload: unknown,
): Promise<ImportBootstrapResult> {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("version" in payload) ||
    payload.version !== 2
  ) {
    throw new Error("Unsupported bootstrap export format. Expected version 2.");
  }

  const exportData = payload as MapBootstrapExport;
  const existingPoints = await listMapPoints(db, mapId);
  const refToLocalId = new Map<string, number>();

  for (const point of existingPoints) {
    if (point.ref) {
      refToLocalId.set(point.ref, point.id);
    }
  }

  const exportIdToRef = new Map<number, string>();
  for (const point of exportData.mapPoints) {
    exportIdToRef.set(point.id, resolveImportRef(point.ref, point.id));
  }

  let mapPointsCreated = 0;
  let mapPointsSkipped = 0;

  for (const point of exportData.mapPoints) {
    const ref = exportIdToRef.get(point.id) ?? resolveImportRef(point.ref, point.id);
    if (refToLocalId.has(ref)) {
      mapPointsSkipped += 1;
      continue;
    }

    const created = await createMapPoint(db, {
      mapId,
      ref,
      name: point.name,
      category: point.category as MapPointCategory,
      nodeRole: point.nodeRole,
      longitude: point.longitude,
      latitude: point.latitude,
      elevation: point.elevation,
      elevationSource: point.elevationSource,
      description: point.description,
      parentRef: point.parentRef,
      sortOrder: point.sortOrder,
      metadata: point.metadata,
    });

    refToLocalId.set(ref, created.id);
    mapPointsCreated += 1;
  }

  const exportMarkerIdToLocalId = new Map<number, number>();
  for (const point of exportData.mapPoints) {
    const ref = exportIdToRef.get(point.id);
    if (!ref) {
      continue;
    }
    const localId = refToLocalId.get(ref);
    if (localId !== undefined) {
      exportMarkerIdToLocalId.set(point.id, localId);
    }
  }

  let markerNeighborsCreated = 0;

  for (const neighbor of exportData.markerNeighbors) {
    const fromMarkerId = exportMarkerIdToLocalId.get(neighbor.fromMarkerId);
    const toMarkerId = exportMarkerIdToLocalId.get(neighbor.toMarkerId);
    if (fromMarkerId === undefined || toMarkerId === undefined) {
      continue;
    }

    const [existing] = await db
      .select({ id: markerNeighborTable.id })
      .from(markerNeighborTable)
      .where(
        and(
          eq(markerNeighborTable.mapId, mapId),
          eq(markerNeighborTable.fromMarkerId, fromMarkerId),
          eq(markerNeighborTable.toMarkerId, toMarkerId),
        ),
      )
      .limit(1);

    if (existing) {
      continue;
    }

    const [row] = await db
      .insert(markerNeighborTable)
      .values({
        mapId,
        fromMarkerId,
        toMarkerId,
        updatedAt: new Date(),
      })
      .returning();

    if (!row) {
      continue;
    }

    markerNeighborsCreated += 1;
    await recordLocalEvent(db, {
      tableName: "marker_neighbor",
      rowId: String(row.id),
      action: "create",
      payload: {
        id: row.id,
        mapId,
        fromMarkerId,
        toMarkerId,
      },
    });
  }

  const existingSegments = await db
    .select({
      segmentGroupId: geoSegmentTable.segmentGroupId,
      segmentIndex: geoSegmentTable.segmentIndex,
    })
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId));

  const segmentKeySet = new Set(
    existingSegments.map((segment) => `${segment.segmentGroupId}:${segment.segmentIndex}`),
  );

  let geoSegmentsCreated = 0;
  let geoSegmentsSkipped = 0;

  for (const segment of exportData.geoSegments) {
    const key = `${segment.segmentGroupId}:${segment.segmentIndex}`;
    if (segmentKeySet.has(key)) {
      geoSegmentsSkipped += 1;
      continue;
    }

    await createGeoSegment(db, {
      mapId,
      segmentGroupId: segment.segmentGroupId,
      segmentIndex: segment.segmentIndex,
      name: segment.name,
      geometry: segment.geometryJson,
    });

    segmentKeySet.add(key);
    geoSegmentsCreated += 1;
  }

  let segmentEdgesCreated = 0;
  let segmentEdgesUpdated = 0;

  for (const edge of exportData.segmentEdges) {
    const [existing] = await db
      .select()
      .from(segmentEdgeTable)
      .where(
        and(
          eq(segmentEdgeTable.mapId, mapId),
          eq(segmentEdgeTable.fromRef, edge.fromRef),
          eq(segmentEdgeTable.toRef, edge.toRef),
          eq(segmentEdgeTable.pathSlug, edge.pathSlug),
        ),
      )
      .limit(1);

    if (existing) {
      const [row] = await db
        .update(segmentEdgeTable)
        .set({
          startFraction: edge.startFraction,
          endFraction: edge.endFraction,
          geometryJson: edge.geometryJson,
          lengthM: edge.lengthM,
          kind: edge.kind,
          bidirectional: edge.bidirectional,
          status: edge.status,
          metadata: edge.metadata,
          updatedAt: new Date(),
        })
        .where(eq(segmentEdgeTable.id, existing.id))
        .returning();

      if (row) {
        segmentEdgesUpdated += 1;
        await recordLocalEvent(db, {
          tableName: "segment_edge",
          rowId: String(row.id),
          action: "update",
          payload: row as unknown as Record<string, unknown>,
        });
      }
      continue;
    }

    const [row] = await db
      .insert(segmentEdgeTable)
      .values({
        mapId,
        fromRef: edge.fromRef,
        toRef: edge.toRef,
        pathSlug: edge.pathSlug,
        startFraction: edge.startFraction,
        endFraction: edge.endFraction,
        geometryJson: edge.geometryJson,
        lengthM: edge.lengthM,
        kind: edge.kind,
        bidirectional: edge.bidirectional,
        status: edge.status,
        metadata: edge.metadata,
        updatedAt: new Date(),
      })
      .returning();

    if (!row) {
      continue;
    }

    segmentEdgesCreated += 1;
    await recordLocalEvent(db, {
      tableName: "segment_edge",
      rowId: String(row.id),
      action: "create",
      payload: row as unknown as Record<string, unknown>,
    });
  }

  return {
    mapPointsCreated,
    mapPointsSkipped,
    markerNeighborsCreated,
    geoSegmentsCreated,
    geoSegmentsSkipped,
    segmentEdgesCreated,
    segmentEdgesUpdated,
  };
}
