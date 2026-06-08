import { recordLocalEvent } from "@/data-access-layer/pglite/local-events";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { mapPointTable, type MapPointRow } from "@/lib/pglite/schema/map-point.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type {
  CreateMapPointInput,
  MapPointCategory,
  MapPointElevationSource,
  MapPointNodeRole,
  MapPointRecord,
  UpdateMapPointInput,
} from "@/types/map/map-points";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { and, asc, eq, ne } from "drizzle-orm";

function toRecord(row: MapPointRow): MapPointRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    ref: row.ref,
    name: row.name,
    category: row.category as MapPointCategory,
    nodeRole: (row.nodeRole as MapPointNodeRole | null) ?? null,
    longitude: row.location.x,
    latitude: row.location.y,
    elevation: row.elevation,
    elevationSource: (row.elevationSource as MapPointElevationSource | null) ?? null,
    description: row.description,
    parentRef: row.parentRef,
    sortOrder: row.sortOrder,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeRef(ref: string | null | undefined): string | null {
  const trimmed = ref?.trim();
  return trimmed ? trimmed : null;
}

async function assertRefAvailable(
  db: PgliteDb,
  mapId: number,
  ref: string | null,
  excludePointId?: number,
) {
  if (!ref) {
    return;
  }

  const conditions = [eq(mapPointTable.mapId, mapId), eq(mapPointTable.ref, ref)];
  if (excludePointId !== undefined) {
    conditions.push(ne(mapPointTable.id, excludePointId));
  }

  const [conflict] = await db
    .select({ id: mapPointTable.id })
    .from(mapPointTable)
    .where(and(...conditions))
    .limit(1);

  if (conflict) {
    throw new Error(`Reference "${ref}" is already used by another point on this map.`);
  }
}

export async function listMapPoints(db: PgliteDb, mapId: number): Promise<MapPointRecord[]> {
  const rows = await db
    .select()
    .from(mapPointTable)
    .where(eq(mapPointTable.mapId, mapId))
    .orderBy(asc(mapPointTable.sortOrder), asc(mapPointTable.id));

  return rows.map(toRecord);
}

export async function createMapPoint(db: PgliteDb, input: CreateMapPointInput) {
  const ref = normalizeRef(input.ref);
  await assertRefAvailable(db, input.mapId, ref);

  const [row] = await db
    .insert(mapPointTable)
    .values({
      mapId: input.mapId,
      ref,
      name: input.name?.trim() || null,
      category: input.category ?? "custom",
      nodeRole: input.nodeRole ?? null,
      location: { x: input.longitude, y: input.latitude },
      elevation: input.elevation ?? null,
      elevationSource: input.elevationSource ?? null,
      description: input.description?.trim() || null,
      parentRef: normalizeRef(input.parentRef),
      sortOrder: input.sortOrder ?? 0,
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create point.");
  }

  const record = toRecord(row);
  await recordLocalEvent(db, {
    tableName: "map_point",
    rowId: String(record.id),
    action: "create",
    payload: record as unknown as Record<string, unknown>,
  });

  return record;
}

export async function updateMapPoint(db: PgliteDb, input: UpdateMapPointInput) {
  const patch: Partial<typeof mapPointTable.$inferInsert> = { updatedAt: new Date() };

  if (input.longitude !== undefined && input.latitude !== undefined) {
    patch.location = { x: input.longitude, y: input.latitude };
  }
  if (input.ref !== undefined) {
    const ref = normalizeRef(input.ref);
    await assertRefAvailable(db, input.mapId, ref, input.pointId);
    patch.ref = ref;
  }
  if (input.name !== undefined) {
    patch.name = input.name?.trim() || null;
  }
  if (input.category !== undefined) {
    patch.category = input.category;
  }
  if (input.nodeRole !== undefined) {
    patch.nodeRole = input.nodeRole;
  }
  if (input.elevation !== undefined) {
    patch.elevation = input.elevation;
  }
  if (input.elevationSource !== undefined) {
    patch.elevationSource = input.elevationSource;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.parentRef !== undefined) {
    patch.parentRef = normalizeRef(input.parentRef);
  }
  if (input.sortOrder !== undefined) {
    patch.sortOrder = input.sortOrder;
  }
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata ?? {};
  }

  const [row] = await db
    .update(mapPointTable)
    .set(patch)
    .where(and(eq(mapPointTable.id, input.pointId), eq(mapPointTable.mapId, input.mapId)))
    .returning();

  if (!row) {
    throw new Error("Point not found.");
  }

  const record = toRecord(row);
  await recordLocalEvent(db, {
    tableName: "map_point",
    rowId: String(record.id),
    action: "update",
    payload: record as unknown as Record<string, unknown>,
  });

  return record;
}

export async function deleteMapPoint(db: PgliteDb, mapId: number, pointId: number) {
  const [existing] = await db
    .select()
    .from(mapPointTable)
    .where(and(eq(mapPointTable.id, pointId), eq(mapPointTable.mapId, mapId)))
    .limit(1);

  if (!existing) {
    throw new Error("Point not found.");
  }

  await db
    .delete(mapPointTable)
    .where(and(eq(mapPointTable.id, pointId), eq(mapPointTable.mapId, mapId)));

  await recordLocalEvent(db, {
    tableName: "map_point",
    rowId: String(pointId),
    action: "delete",
    payload: { id: pointId, mapId },
  });
}

export function mapPointsQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.mapPoints(mapId),
    queryFn: () => listMapPoints(db, mapId),
  });
}

export function createMapPointMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: Omit<CreateMapPointInput, "mapId">) =>
      createMapPoint(db, { ...input, mapId }),
  });
}

export function updateMapPointMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: Omit<UpdateMapPointInput, "mapId">) =>
      updateMapPoint(db, { ...input, mapId }),
  });
}

export function deleteMapPointMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (pointId: number) => deleteMapPoint(db, mapId, pointId),
  });
}
