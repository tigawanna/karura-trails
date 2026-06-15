import { mapLandmarkTypeTable } from "@/lib/pglite/schema/map-landmark-type.schema";
import { markerNeighborTable } from "@/lib/pglite/schema/marker-neighbor.schema";
import { mapPointTable } from "@/lib/pglite/schema/map-point.schema";
import { mapTable } from "@/lib/pglite/schema/map.schema";
import { markSyncEventsApplied } from "@/data-access-layer/pglite/applied-sync-events";
import { updateMapWorkspace } from "@/data-access-layer/pglite/maps";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MapPointCategory, MapPointNodeRole, MapPointRecord } from "@/types/map/map-points";
import type { SyncEventRecord } from "@/types/sync";
import { and, eq, sql } from "drizzle-orm";

type SourceMarkerMap = Map<number, number>;

function parseSourceMarkerId(payload: Record<string, unknown>): number | null {
  const value = payload.sourceMarkerId;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function findPointIdBySourceMarkerId(
  db: PgliteDb,
  mapId: number,
  sourceMarkerId: number,
): Promise<number | null> {
  const [row] = await db
    .select({ id: mapPointTable.id })
    .from(mapPointTable)
    .where(
      and(
        eq(mapPointTable.mapId, mapId),
        sql`${mapPointTable.metadata}->>'sourceMarkerId' = ${String(sourceMarkerId)}`,
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

async function buildSourceMarkerMap(db: PgliteDb, mapId: number): Promise<SourceMarkerMap> {
  const rows = await db
    .select({ id: mapPointTable.id, metadata: mapPointTable.metadata })
    .from(mapPointTable)
    .where(eq(mapPointTable.mapId, mapId));

  const map: SourceMarkerMap = new Map();
  for (const row of rows) {
    const sourceMarkerId = row.metadata?.sourceMarkerId;
    if (sourceMarkerId) {
      const parsed = Number(sourceMarkerId);
      if (Number.isFinite(parsed)) {
        map.set(parsed, row.id);
      }
    }
  }
  return map;
}

function isMapPointPayload(payload: Record<string, unknown>): payload is Record<string, unknown> & {
  longitude: number;
  latitude: number;
  category: MapPointCategory;
} {
  return typeof payload.longitude === "number" && typeof payload.latitude === "number";
}

async function applyMapPointCreate(
  db: PgliteDb,
  mapId: number,
  payload: Record<string, unknown>,
  sourceMarkerMap: SourceMarkerMap,
) {
  const sourceMarkerId = parseSourceMarkerId(payload);
  if (sourceMarkerId == null || !isMapPointPayload(payload)) {
    return false;
  }

  const existingId =
    sourceMarkerMap.get(sourceMarkerId) ??
    (await findPointIdBySourceMarkerId(db, mapId, sourceMarkerId));
  if (existingId != null) {
    sourceMarkerMap.set(sourceMarkerId, existingId);
    const metadata = { ...(payload.metadata as Record<string, string> | undefined) };
    metadata.sourceMarkerId = String(sourceMarkerId);
    await db
      .update(mapPointTable)
      .set({
        ref: typeof payload.ref === "string" ? payload.ref : null,
        name: typeof payload.name === "string" ? payload.name : null,
        category: payload.category,
        nodeRole: (payload.nodeRole as MapPointNodeRole | null) ?? null,
        location: { x: payload.longitude, y: payload.latitude },
        elevation: typeof payload.elevation === "number" ? payload.elevation : null,
        elevationSource:
          payload.elevationSource === "manual" || payload.elevationSource === "inferred_from_path"
            ? payload.elevationSource
            : null,
        description: typeof payload.description === "string" ? payload.description : null,
        parentRef: typeof payload.parentRef === "string" ? payload.parentRef : null,
        sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
        metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(mapPointTable.id, existingId), eq(mapPointTable.mapId, mapId)));
    return true;
  }

  const metadata = { ...(payload.metadata as Record<string, string> | undefined) };
  metadata.sourceMarkerId = String(sourceMarkerId);

  const [row] = await db
    .insert(mapPointTable)
    .values({
      mapId,
      ref: typeof payload.ref === "string" ? payload.ref : null,
      name: typeof payload.name === "string" ? payload.name : null,
      category: payload.category,
      nodeRole: (payload.nodeRole as MapPointNodeRole | null) ?? null,
      location: { x: payload.longitude, y: payload.latitude },
      elevation: typeof payload.elevation === "number" ? payload.elevation : null,
      elevationSource:
        payload.elevationSource === "manual" || payload.elevationSource === "inferred_from_path"
          ? payload.elevationSource
          : null,
      description: typeof payload.description === "string" ? payload.description : null,
      parentRef: typeof payload.parentRef === "string" ? payload.parentRef : null,
      sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
      metadata,
      updatedAt: new Date(),
    })
    .returning({ id: mapPointTable.id });

  if (!row) {
    return false;
  }

  sourceMarkerMap.set(sourceMarkerId, row.id);
  return true;
}

async function applyMapPointUpdate(db: PgliteDb, mapId: number, payload: Record<string, unknown>) {
  const record = payload as unknown as MapPointRecord;
  if (typeof record.id !== "number" || typeof record.latitude !== "number") {
    return false;
  }

  await db
    .update(mapPointTable)
    .set({
      ref: record.ref,
      name: record.name,
      category: record.category,
      nodeRole: record.nodeRole,
      location: { x: record.longitude, y: record.latitude },
      elevation: record.elevation,
      elevationSource: record.elevationSource,
      description: record.description,
      parentRef: record.parentRef,
      sortOrder: record.sortOrder,
      metadata: record.metadata,
      updatedAt: new Date(),
    })
    .where(and(eq(mapPointTable.id, record.id), eq(mapPointTable.mapId, mapId)));

  return true;
}

async function applyMapPointDelete(db: PgliteDb, mapId: number, rowId: string) {
  const pointId = Number(rowId);
  if (!Number.isFinite(pointId)) {
    return false;
  }
  await db
    .delete(mapPointTable)
    .where(and(eq(mapPointTable.id, pointId), eq(mapPointTable.mapId, mapId)));
  return true;
}

async function neighborEdgeExists(
  db: PgliteDb,
  mapId: number,
  fromMarkerId: number,
  toMarkerId: number,
) {
  const [row] = await db
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
  return row != null;
}

async function applyMarkerNeighborCreate(
  db: PgliteDb,
  mapId: number,
  payload: Record<string, unknown>,
  sourceMarkerMap: SourceMarkerMap,
) {
  const fromSourceMarkerId = payload.fromSourceMarkerId;
  const toSourceMarkerId = payload.toSourceMarkerId;

  if (typeof fromSourceMarkerId !== "number" || typeof toSourceMarkerId !== "number") {
    const fromMarkerId = payload.fromMarkerId;
    const toMarkerId = payload.toMarkerId;
    if (typeof fromMarkerId !== "number" || typeof toMarkerId !== "number") {
      return false;
    }
    if (await neighborEdgeExists(db, mapId, fromMarkerId, toMarkerId)) {
      return false;
    }
    await db.insert(markerNeighborTable).values({
      mapId,
      fromMarkerId,
      toMarkerId,
      updatedAt: new Date(),
    });
    return true;
  }

  const fromMarkerId = sourceMarkerMap.get(fromSourceMarkerId);
  const toMarkerId = sourceMarkerMap.get(toSourceMarkerId);
  if (fromMarkerId == null || toMarkerId == null) {
    return false;
  }
  if (await neighborEdgeExists(db, mapId, fromMarkerId, toMarkerId)) {
    return false;
  }
  await db.insert(markerNeighborTable).values({
    mapId,
    fromMarkerId,
    toMarkerId,
    updatedAt: new Date(),
  });
  return true;
}

async function applyLandmarkTypeCreate(
  db: PgliteDb,
  mapId: number,
  payload: Record<string, unknown>,
) {
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const label = typeof payload.label === "string" ? payload.label.trim() : "";
  if (!slug || !label) {
    return false;
  }

  const [existing] = await db
    .select({ id: mapLandmarkTypeTable.id })
    .from(mapLandmarkTypeTable)
    .where(and(eq(mapLandmarkTypeTable.mapId, mapId), eq(mapLandmarkTypeTable.slug, slug)))
    .limit(1);

  if (existing) {
    return false;
  }

  await db.insert(mapLandmarkTypeTable).values({
    mapId,
    slug,
    label,
    sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
    updatedAt: new Date(),
  });
  return true;
}

async function applyMapUpdate(db: PgliteDb, mapId: number, payload: Record<string, unknown>) {
  try {
    await updateMapWorkspace(db, mapId, {
      locationQuery: typeof payload.locationQuery === "string" ? payload.locationQuery : undefined,
      mapCenterLat: typeof payload.mapCenterLat === "number" ? payload.mapCenterLat : undefined,
      mapCenterLng: typeof payload.mapCenterLng === "number" ? payload.mapCenterLng : undefined,
      mapZoom: typeof payload.mapZoom === "number" ? payload.mapZoom : undefined,
    });

    if (typeof payload.name === "string" && payload.name.trim()) {
      await db
        .update(mapTable)
        .set({ name: payload.name.trim(), updatedAt: new Date() })
        .where(eq(mapTable.id, mapId));
    }

    return true;
  } catch {
    return false;
  }
}

export async function applySyncEvents(db: PgliteDb, mapId: number, events: SyncEventRecord[]) {
  const verified = events.filter((event) => event.verified);
  const sourceMarkerMap = await buildSourceMarkerMap(db, mapId);
  const skippedIds = new Set<string>();
  let applied = 0;

  const sorted = [...verified].sort((left, right) => left.id.localeCompare(right.id));

  for (const event of sorted) {
    const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
    let didApply = false;

    if (event.tableName === "map" && event.action === "update") {
      didApply = await applyMapUpdate(db, mapId, payload);
    } else if (event.tableName === "landmark_type" && event.action === "create") {
      didApply = await applyLandmarkTypeCreate(db, mapId, payload);
    } else if (event.tableName === "map_point") {
      if (event.action === "create") {
        didApply = await applyMapPointCreate(db, mapId, payload, sourceMarkerMap);
      } else if (event.action === "update") {
        didApply = await applyMapPointUpdate(db, mapId, payload);
      } else if (event.action === "delete") {
        didApply = await applyMapPointDelete(db, mapId, event.rowId);
      }
    } else if (event.tableName === "marker_neighbor" && event.action === "create") {
      didApply = await applyMarkerNeighborCreate(db, mapId, payload, sourceMarkerMap);
    }

    if (didApply) {
      applied += 1;
    } else {
      skippedIds.add(event.id);
    }
  }

  await markSyncEventsApplied(db, sorted, skippedIds);

  return { applied, total: verified.length, skipped: skippedIds.size };
}

export async function squashApprovedSyncEvents(
  db: PgliteDb,
  mapId: number,
  events: SyncEventRecord[],
) {
  const result = await applySyncEvents(db, mapId, events);
  return { applied: result.applied, total: result.total };
}
