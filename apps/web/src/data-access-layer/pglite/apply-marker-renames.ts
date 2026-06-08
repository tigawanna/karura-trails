import { recordLocalEvent } from "@/data-access-layer/pglite/local-events";
import { mapPointTable } from "@/lib/pglite/schema/map-point.schema";
import { segmentEdgeTable } from "@/lib/pglite/schema/segment-edge.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MarkerRenameApplyInput } from "@/types/map/marker-rename";
import { mutationOptions } from "@tanstack/react-query";
import { and, eq, inArray, or } from "drizzle-orm";

export type ApplyMarkerRenamesResult = {
  updatedPoints: number;
  updatedSegmentEdges: number;
};

export async function applyMarkerRenames(
  db: PgliteDb,
  mapId: number,
  changes: MarkerRenameApplyInput[],
): Promise<ApplyMarkerRenamesResult> {
  if (changes.length === 0) {
    return { updatedPoints: 0, updatedSegmentEdges: 0 };
  }

  const refMapping = new Map<string, string>();
  for (const change of changes) {
    const [existing] = await db
      .select({ ref: mapPointTable.ref, name: mapPointTable.name })
      .from(mapPointTable)
      .where(and(eq(mapPointTable.id, change.pointId), eq(mapPointTable.mapId, mapId)))
      .limit(1);

    if (!existing) {
      continue;
    }

    const oldRef = existing.ref?.trim() || existing.name?.trim();
    if (oldRef && oldRef !== change.ref) {
      refMapping.set(oldRef, change.ref);
    }
  }

  const now = new Date();

  for (const change of changes) {
    await db
      .update(mapPointTable)
      .set({
        ref: `__rename_${change.pointId}`,
        updatedAt: now,
      })
      .where(and(eq(mapPointTable.id, change.pointId), eq(mapPointTable.mapId, mapId)));
  }

  for (const change of changes) {
    const [row] = await db
      .update(mapPointTable)
      .set({
        ref: change.ref,
        name: change.name,
        parentRef: change.parentRef,
        sortOrder: change.sortOrder,
        updatedAt: now,
      })
      .where(and(eq(mapPointTable.id, change.pointId), eq(mapPointTable.mapId, mapId)))
      .returning();

    if (!row) {
      continue;
    }

    await recordLocalEvent(db, {
      tableName: "map_point",
      rowId: String(row.id),
      action: "update",
      payload: row as unknown as Record<string, unknown>,
    });
  }

  let updatedSegmentEdges = 0;
  const oldRefs = [...refMapping.keys()];

  if (oldRefs.length > 0) {
    const edges = await db
      .select()
      .from(segmentEdgeTable)
      .where(
        and(
          eq(segmentEdgeTable.mapId, mapId),
          or(inArray(segmentEdgeTable.fromRef, oldRefs), inArray(segmentEdgeTable.toRef, oldRefs)),
        ),
      );

    for (const edge of edges) {
      const nextFromRef = refMapping.get(edge.fromRef) ?? edge.fromRef;
      const nextToRef = refMapping.get(edge.toRef) ?? edge.toRef;
      if (nextFromRef === edge.fromRef && nextToRef === edge.toRef) {
        continue;
      }

      const [row] = await db
        .update(segmentEdgeTable)
        .set({
          fromRef: nextFromRef,
          toRef: nextToRef,
          updatedAt: now,
        })
        .where(eq(segmentEdgeTable.id, edge.id))
        .returning();

      if (row) {
        updatedSegmentEdges += 1;
        await recordLocalEvent(db, {
          tableName: "segment_edge",
          rowId: String(row.id),
          action: "update",
          payload: row as unknown as Record<string, unknown>,
        });
      }
    }
  }

  return {
    updatedPoints: changes.length,
    updatedSegmentEdges,
  };
}

export function applyMarkerRenamesMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (changes: MarkerRenameApplyInput[]) => applyMarkerRenames(db, mapId, changes),
  });
}
