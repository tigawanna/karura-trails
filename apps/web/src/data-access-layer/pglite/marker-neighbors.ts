import { recordLocalEvent } from "@/data-access-layer/pglite/local-events";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import {
  markerNeighborTable,
  type MarkerNeighborRow,
} from "@/lib/pglite/schema/marker-neighbor.schema";
import { mapPointTable } from "@/lib/pglite/schema/map-point.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { and, asc, eq, inArray } from "drizzle-orm";

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

async function insertEdge(db: PgliteDb, mapId: number, fromMarkerId: number, toMarkerId: number) {
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
    return;
  }
  await db.insert(markerNeighborTable).values({
    mapId,
    fromMarkerId,
    toMarkerId,
    updatedAt: new Date(),
  });
}

async function deleteEdge(db: PgliteDb, mapId: number, fromMarkerId: number, toMarkerId: number) {
  await db
    .delete(markerNeighborTable)
    .where(
      and(
        eq(markerNeighborTable.mapId, mapId),
        eq(markerNeighborTable.fromMarkerId, fromMarkerId),
        eq(markerNeighborTable.toMarkerId, toMarkerId),
      ),
    );
}

export async function listMarkerNeighbors(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(markerNeighborTable)
    .where(eq(markerNeighborTable.mapId, mapId))
    .orderBy(asc(markerNeighborTable.fromMarkerId), asc(markerNeighborTable.toMarkerId));

  return rows.map(toRecord);
}

export async function replaceMarkerNeighbors(
  db: PgliteDb,
  input: { mapId: number; fromMarkerId: number; toMarkerIds: number[] },
) {
  const anchorId = input.fromMarkerId;
  const nextIds = new Set(input.toMarkerIds.filter((markerId) => markerId !== anchorId));

  const pointIds = [anchorId, ...nextIds];
  const validPoints = await db
    .select({ id: mapPointTable.id })
    .from(mapPointTable)
    .where(and(eq(mapPointTable.mapId, input.mapId), inArray(mapPointTable.id, pointIds)));

  if (validPoints.length !== pointIds.length) {
    throw new Error("All neighbors must belong to this map.");
  }

  const currentRows = await db
    .select()
    .from(markerNeighborTable)
    .where(
      and(
        eq(markerNeighborTable.mapId, input.mapId),
        eq(markerNeighborTable.fromMarkerId, anchorId),
      ),
    );

  const currentIds = new Set(currentRows.map((row) => row.toMarkerId));

  for (const toMarkerId of currentIds) {
    if (!nextIds.has(toMarkerId)) {
      await deleteEdge(db, input.mapId, anchorId, toMarkerId);
      await deleteEdge(db, input.mapId, toMarkerId, anchorId);
    }
  }

  for (const toMarkerId of nextIds) {
    if (!currentIds.has(toMarkerId)) {
      await insertEdge(db, input.mapId, anchorId, toMarkerId);
      await insertEdge(db, input.mapId, toMarkerId, anchorId);
    }
  }

  await recordLocalEvent(db, {
    tableName: "marker_neighbor",
    rowId: String(anchorId),
    action: "update",
    payload: { mapId: input.mapId, fromMarkerId: anchorId, toMarkerIds: [...nextIds] },
  });

  return listMarkerNeighbors(db, input.mapId);
}

export async function addMarkerNeighborLink(
  db: PgliteDb,
  mapId: number,
  fromMarkerId: number,
  toMarkerId: number,
) {
  if (fromMarkerId === toMarkerId) {
    throw new Error("A marker cannot neighbor itself.");
  }
  await insertEdge(db, mapId, fromMarkerId, toMarkerId);
  await insertEdge(db, mapId, toMarkerId, fromMarkerId);
  await recordLocalEvent(db, {
    tableName: "marker_neighbor",
    rowId: `${fromMarkerId}:${toMarkerId}`,
    action: "create",
    payload: { mapId, fromMarkerId, toMarkerId },
  });
}

export function markerNeighborsQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.markerNeighbors(mapId),
    queryFn: () => listMarkerNeighbors(db, mapId),
  });
}

export function replaceMarkerNeighborsMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: { fromMarkerId: number; toMarkerIds: number[] }) =>
      replaceMarkerNeighbors(db, { mapId, ...input }),
  });
}

export function addMarkerNeighborMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: { fromMarkerId: number; toMarkerId: number }) =>
      addMarkerNeighborLink(db, mapId, input.fromMarkerId, input.toMarkerId),
  });
}

async function listOutgoingNeighborIds(db: PgliteDb, mapId: number, markerId: number) {
  const rows = await db
    .select({ toMarkerId: markerNeighborTable.toMarkerId })
    .from(markerNeighborTable)
    .where(
      and(eq(markerNeighborTable.mapId, mapId), eq(markerNeighborTable.fromMarkerId, markerId)),
    );

  return new Set(rows.map((row) => row.toMarkerId));
}

export async function insertMarkerBetween(
  db: PgliteDb,
  input: {
    mapId: number;
    newMarkerId: number;
    fromMarkerId: number;
    toMarkerId: number;
  },
) {
  const fromNeighbors = await listOutgoingNeighborIds(db, input.mapId, input.fromMarkerId);
  const toNeighbors = await listOutgoingNeighborIds(db, input.mapId, input.toMarkerId);

  if (!fromNeighbors.has(input.toMarkerId) || !toNeighbors.has(input.fromMarkerId)) {
    throw new Error("Markers must already be linked neighbors.");
  }

  fromNeighbors.delete(input.toMarkerId);
  fromNeighbors.add(input.newMarkerId);
  toNeighbors.delete(input.fromMarkerId);
  toNeighbors.add(input.newMarkerId);

  await replaceMarkerNeighbors(db, {
    mapId: input.mapId,
    fromMarkerId: input.fromMarkerId,
    toMarkerIds: [...fromNeighbors],
  });
  await replaceMarkerNeighbors(db, {
    mapId: input.mapId,
    fromMarkerId: input.toMarkerId,
    toMarkerIds: [...toNeighbors],
  });
  await replaceMarkerNeighbors(db, {
    mapId: input.mapId,
    fromMarkerId: input.newMarkerId,
    toMarkerIds: [input.fromMarkerId, input.toMarkerId],
  });
}

export function insertMarkerBetweenMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: { newMarkerId: number; fromMarkerId: number; toMarkerId: number }) =>
      insertMarkerBetween(db, { mapId, ...input }),
  });
}
