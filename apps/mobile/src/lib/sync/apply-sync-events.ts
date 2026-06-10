import { resolveMarkerKind } from "@/geo/marker-kind";
import type { DrizzleDB } from "@/lib/drizzle/client";
import {
  landmarkTypes,
  pointNeighbors,
  points,
  type PointCategory,
  type PointNodeRole,
} from "@/lib/drizzle/schema";
import { markSyncEventsApplied } from "@/lib/sync/applied-sync-events";
import type { SyncEventRecord } from "@/lib/sync/sync.types";
import { and, eq, sql } from "drizzle-orm";

type SourceMarkerMap = Map<number, number>;

const VALID_CATEGORIES = new Set<PointCategory>([
  "junction",
  "gate",
  "bridge",
  "viewpoint",
  "water",
  "cave",
  "rest_area",
  "sign",
  "custom",
]);

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

function normalizeCategory(value: unknown): PointCategory {
  if (typeof value === "string" && VALID_CATEGORIES.has(value as PointCategory)) {
    return value as PointCategory;
  }
  return "custom";
}

function geometryToString(longitude: number, latitude: number, elevation: number | null): string {
  const coordinates =
    elevation != null && Number.isFinite(elevation)
      ? [longitude, latitude, elevation]
      : [longitude, latitude];
  return JSON.stringify({
    type: "Point",
    coordinates,
  });
}

async function findPointIdBySourceMarkerId(
  database: DrizzleDB,
  sourceMarkerId: number,
): Promise<number | null> {
  const [row] = await database
    .select({ id: points.id })
    .from(points)
    .where(eq(points.sourceId, sourceMarkerId))
    .limit(1);
  return row?.id ?? null;
}

async function buildSourceMarkerMap(database: DrizzleDB): Promise<SourceMarkerMap> {
  const rows = await database
    .select({ id: points.id, sourceId: points.sourceId })
    .from(points)
    .where(sql`${points.sourceId} IS NOT NULL`);

  const map: SourceMarkerMap = new Map();
  for (const row of rows) {
    if (row.sourceId != null) {
      map.set(row.sourceId, row.id);
    }
  }
  return map;
}

function isMapPointPayload(payload: Record<string, unknown>): payload is Record<string, unknown> & {
  longitude: number;
  latitude: number;
} {
  return typeof payload.longitude === "number" && typeof payload.latitude === "number";
}

async function applyMapPointCreate(
  database: DrizzleDB,
  payload: Record<string, unknown>,
  sourceMarkerMap: SourceMarkerMap,
) {
  const sourceMarkerId = parseSourceMarkerId(payload);
  if (sourceMarkerId == null || !isMapPointPayload(payload)) {
    return false;
  }

  const existingId =
    sourceMarkerMap.get(sourceMarkerId) ??
    (await findPointIdBySourceMarkerId(database, sourceMarkerId));
  if (existingId != null) {
    sourceMarkerMap.set(sourceMarkerId, existingId);
    return false;
  }

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? { ...(payload.metadata as Record<string, string>) }
      : {};
  metadata.sourceMarkerId = String(sourceMarkerId);

  const elevation =
    typeof payload.elevation === "number" && Number.isFinite(payload.elevation)
      ? payload.elevation
      : null;
  const now =
    typeof payload.updatedAt === "string"
      ? payload.updatedAt
      : typeof payload.createdAt === "string"
        ? payload.createdAt
        : new Date().toISOString();

  const [created] = await database
    .insert(points)
    .values({
      ref: typeof payload.ref === "string" ? payload.ref : null,
      name: typeof payload.name === "string" ? payload.name : null,
      description: typeof payload.description === "string" ? payload.description : null,
      category: normalizeCategory(payload.category),
      markerKind:
        typeof metadata.markerKind === "string"
          ? (metadata.markerKind as "physical" | "virtual" | "landmark")
          : resolveMarkerKind({
              ref: typeof payload.ref === "string" ? payload.ref : null,
              name: typeof payload.name === "string" ? payload.name : null,
              parentRef: typeof payload.parentRef === "string" ? payload.parentRef : null,
              metadata,
            }),
      nodeRole:
        payload.nodeRole === "junction" ||
        payload.nodeRole === "endpoint" ||
        payload.nodeRole === "waypoint"
          ? (payload.nodeRole as PointNodeRole)
          : null,
      sourceId: sourceMarkerId,
      sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
      parentRef: typeof payload.parentRef === "string" ? payload.parentRef : null,
      metadataJson: JSON.stringify(metadata),
      elevation,
      elevationSource:
        payload.elevationSource === "manual" || payload.elevationSource === "inferred_from_path"
          ? payload.elevationSource
          : null,
      geom: geometryToString(payload.longitude, payload.latitude, elevation),
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : now,
      updatedAt: now,
    })
    .returning({ id: points.id });

  if (!created) {
    return false;
  }

  sourceMarkerMap.set(sourceMarkerId, created.id);
  return true;
}

async function applyMapPointUpdate(database: DrizzleDB, payload: Record<string, unknown>) {
  const sourceMarkerId = parseSourceMarkerId(payload);
  if (sourceMarkerId == null || !isMapPointPayload(payload)) {
    return false;
  }

  const pointId = await findPointIdBySourceMarkerId(database, sourceMarkerId);
  if (pointId == null) {
    return false;
  }

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? { ...(payload.metadata as Record<string, string>) }
      : {};
  metadata.sourceMarkerId = String(sourceMarkerId);
  const elevation =
    typeof payload.elevation === "number" && Number.isFinite(payload.elevation)
      ? payload.elevation
      : null;

  await database
    .update(points)
    .set({
      ref: typeof payload.ref === "string" ? payload.ref : null,
      name: typeof payload.name === "string" ? payload.name : null,
      description: typeof payload.description === "string" ? payload.description : null,
      category: normalizeCategory(payload.category),
      nodeRole:
        payload.nodeRole === "junction" ||
        payload.nodeRole === "endpoint" ||
        payload.nodeRole === "waypoint"
          ? (payload.nodeRole as PointNodeRole)
          : null,
      sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
      parentRef: typeof payload.parentRef === "string" ? payload.parentRef : null,
      metadataJson: JSON.stringify(metadata),
      elevation,
      elevationSource:
        payload.elevationSource === "manual" || payload.elevationSource === "inferred_from_path"
          ? payload.elevationSource
          : null,
      geom: geometryToString(payload.longitude, payload.latitude, elevation),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(points.id, pointId));

  return true;
}

async function applyMapPointDelete(database: DrizzleDB, rowId: string) {
  const sourceMarkerId = Number(rowId);
  if (Number.isFinite(sourceMarkerId)) {
    const bySource = await findPointIdBySourceMarkerId(database, sourceMarkerId);
    if (bySource != null) {
      await database.delete(points).where(eq(points.id, bySource));
      return true;
    }
  }

  const pointId = Number(rowId);
  if (!Number.isFinite(pointId)) {
    return false;
  }

  await database.delete(points).where(eq(points.id, pointId));
  return true;
}

async function neighborEdgeExists(database: DrizzleDB, fromPointId: number, toPointId: number) {
  const [row] = await database
    .select({ id: pointNeighbors.id })
    .from(pointNeighbors)
    .where(
      and(eq(pointNeighbors.fromPointId, fromPointId), eq(pointNeighbors.toPointId, toPointId)),
    )
    .limit(1);
  return row != null;
}

async function applyMarkerNeighborCreate(
  database: DrizzleDB,
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
    if (await neighborEdgeExists(database, fromMarkerId, toMarkerId)) {
      return false;
    }
    await database.insert(pointNeighbors).values({
      fromPointId: fromMarkerId,
      toPointId: toMarkerId,
      sourceId: typeof payload.sourceNeighborId === "number" ? payload.sourceNeighborId : null,
    });
    return true;
  }

  const fromPointId =
    sourceMarkerMap.get(fromSourceMarkerId) ??
    (await findPointIdBySourceMarkerId(database, fromSourceMarkerId));
  const toPointId =
    sourceMarkerMap.get(toSourceMarkerId) ??
    (await findPointIdBySourceMarkerId(database, toSourceMarkerId));

  if (fromPointId == null || toPointId == null) {
    return false;
  }
  if (await neighborEdgeExists(database, fromPointId, toPointId)) {
    return false;
  }

  await database.insert(pointNeighbors).values({
    fromPointId,
    toPointId,
    sourceId: typeof payload.sourceNeighborId === "number" ? payload.sourceNeighborId : null,
  });
  return true;
}

async function applyLandmarkTypeCreate(database: DrizzleDB, payload: Record<string, unknown>) {
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const label = typeof payload.label === "string" ? payload.label.trim() : "";
  if (!slug || !label) {
    return false;
  }

  const [existing] = await database
    .select({ id: landmarkTypes.id })
    .from(landmarkTypes)
    .where(eq(landmarkTypes.slug, slug))
    .limit(1);

  if (existing) {
    return false;
  }

  const sourceLandmarkTypeId = payload.sourceLandmarkTypeId;
  await database.insert(landmarkTypes).values({
    sourceId:
      typeof sourceLandmarkTypeId === "number" && Number.isFinite(sourceLandmarkTypeId)
        ? sourceLandmarkTypeId
        : null,
    slug,
    label,
    sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
    createdAt: typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
  });
  return true;
}

export async function applySyncEvents(database: DrizzleDB, events: SyncEventRecord[]) {
  const verified = events.filter((event) => event.verified);
  const sourceMarkerMap = await buildSourceMarkerMap(database);
  const skippedIds = new Set<string>();
  let applied = 0;

  const sorted = [...verified].sort((left, right) => left.id.localeCompare(right.id));

  for (const event of sorted) {
    const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
    let didApply = false;

    if (event.tableName === "map" && event.action === "update") {
      didApply = true;
    } else if (event.tableName === "landmark_type" && event.action === "create") {
      didApply = await applyLandmarkTypeCreate(database, payload);
    } else if (event.tableName === "map_point") {
      if (event.action === "create") {
        didApply = await applyMapPointCreate(database, payload, sourceMarkerMap);
      } else if (event.action === "update") {
        didApply = await applyMapPointUpdate(database, payload);
      } else if (event.action === "delete") {
        didApply = await applyMapPointDelete(database, event.rowId);
      }
    } else if (event.tableName === "marker_neighbor" && event.action === "create") {
      didApply = await applyMarkerNeighborCreate(database, payload, sourceMarkerMap);
    }

    if (didApply) {
      applied += 1;
    } else {
      skippedIds.add(event.id);
    }
  }

  await markSyncEventsApplied(database, sorted, skippedIds);

  return { applied, total: verified.length, skipped: skippedIds.size };
}
