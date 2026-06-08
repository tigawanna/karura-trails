import { mapPointTable } from "@/lib/pglite/schema/map-point.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MapPointCategory, MapPointRecord } from "@/types/map/map-points";
import type { SyncEventRecord } from "@/types/sync";
import { and, eq } from "drizzle-orm";

function isMapPointRecord(payload: Record<string, unknown>): payload is MapPointRecord {
  return typeof payload.id === "number" && typeof payload.latitude === "number";
}

export async function squashApprovedSyncEvents(
  db: PgliteDb,
  mapId: number,
  events: SyncEventRecord[],
) {
  const approved = events.filter((event) => event.verified);
  let applied = 0;

  for (const event of approved) {
    const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;

    if (event.tableName !== "map_point") {
      continue;
    }

    if (event.action === "create" && isMapPointRecord(payload)) {
      await db.insert(mapPointTable).values({
        mapId,
        ref: payload.ref,
        name: payload.name,
        category: payload.category as MapPointCategory,
        nodeRole: payload.nodeRole,
        location: { x: payload.longitude, y: payload.latitude },
        elevation: payload.elevation,
        description: payload.description,
        metadata: payload.metadata,
        updatedAt: new Date(),
      });
      applied += 1;
    } else if (event.action === "update" && isMapPointRecord(payload)) {
      await db
        .update(mapPointTable)
        .set({
          ref: payload.ref,
          name: payload.name,
          category: payload.category,
          nodeRole: payload.nodeRole,
          location: { x: payload.longitude, y: payload.latitude },
          elevation: payload.elevation,
          description: payload.description,
          metadata: payload.metadata,
          updatedAt: new Date(),
        })
        .where(and(eq(mapPointTable.id, payload.id), eq(mapPointTable.mapId, mapId)));
      applied += 1;
    } else if (event.action === "delete") {
      const pointId = Number(event.rowId);
      if (Number.isFinite(pointId)) {
        await db
          .delete(mapPointTable)
          .where(and(eq(mapPointTable.id, pointId), eq(mapPointTable.mapId, mapId)));
        applied += 1;
      }
    }
  }

  return { applied, total: approved.length };
}
