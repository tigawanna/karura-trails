import { db } from "@/lib/drizzle/client";
import { points, syncEvents, type PointSelect } from "@/lib/drizzle/schema";
import { createSyncEventId } from "@/lib/sync/create-sync-event-id";
import { getDeviceId } from "@/lib/sync/device-id";
import { buildMapPointSyncPayload } from "@/lib/sync/point-sync-payload";
import type { SyncAction, SyncEventPayload, SyncEventRecord } from "@/lib/sync/sync.types";
import { and, asc, eq, isNull } from "drizzle-orm";

export async function recordPointSyncEvent(
  point: PointSelect,
  action: SyncAction,
): Promise<string> {
  const deviceId = await getDeviceId();
  const id = createSyncEventId();
  const now = new Date().toISOString();
  const payload = buildMapPointSyncPayload(point);

  await db.insert(syncEvents).values({
    id,
    deviceId,
    tableName: "map_point",
    rowId: String(point.id),
    action,
    payloadJson: JSON.stringify(payload),
    createdAt: now,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    syncedAt: null,
  });

  return id;
}

export async function listPendingOutboundSyncEvents(): Promise<SyncEventRecord[]> {
  const deviceId = await getDeviceId();
  const rows = await db
    .select()
    .from(syncEvents)
    .where(and(eq(syncEvents.deviceId, deviceId), isNull(syncEvents.syncedAt)))
    .orderBy(asc(syncEvents.createdAt));

  return rows.map((row) => ({
    id: row.id,
    deviceId: row.deviceId,
    tableName: row.tableName,
    rowId: row.rowId,
    action: row.action as SyncEventRecord["action"],
    payloadJson: row.payloadJson,
    createdAt: row.createdAt,
    verified: row.verified,
    verifiedAt: row.verifiedAt,
    verifiedBy: row.verifiedBy,
  }));
}

export async function countPendingOutboundSyncEvents(): Promise<number> {
  const events = await listPendingOutboundSyncEvents();
  return events.length;
}

export async function removeOutboundSyncEvent(eventId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await db
    .delete(syncEvents)
    .where(
      and(
        eq(syncEvents.id, eventId),
        eq(syncEvents.deviceId, deviceId),
        isNull(syncEvents.syncedAt),
      ),
    );
}

export async function updateOutboundSyncEventPayload(
  eventId: string,
  patch: { name?: string | null; description?: string | null; category?: string | null },
): Promise<void> {
  const deviceId = await getDeviceId();
  const [event] = await db
    .select()
    .from(syncEvents)
    .where(
      and(
        eq(syncEvents.id, eventId),
        eq(syncEvents.deviceId, deviceId),
        isNull(syncEvents.syncedAt),
      ),
    )
    .limit(1);

  if (!event) {
    throw new Error("Sync event not found.");
  }

  const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
  if (patch.name !== undefined) {
    payload.name = patch.name;
  }
  if (patch.description !== undefined) {
    payload.description = patch.description;
  }
  if (patch.category !== undefined) {
    payload.category = patch.category;
  }
  const updatedAt = new Date().toISOString();
  payload.updatedAt = updatedAt;

  const pointId = Number(event.rowId);

  if (Number.isFinite(pointId)) {
    const pointPatch: Partial<typeof points.$inferInsert> = { updatedAt };
    if (patch.name !== undefined) {
      pointPatch.name = patch.name;
    }
    if (patch.description !== undefined) {
      pointPatch.description = patch.description;
    }
    if (patch.category !== undefined) {
      pointPatch.category = patch.category as PointSelect["category"];
    }
    await db.update(points).set(pointPatch).where(eq(points.id, pointId));
  }

  await db
    .update(syncEvents)
    .set({ payloadJson: JSON.stringify(payload) })
    .where(eq(syncEvents.id, eventId));
}

export async function markOutboundSyncEventsSynced(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) {
    return;
  }

  const syncedAt = new Date().toISOString();
  for (const eventId of eventIds) {
    await db.update(syncEvents).set({ syncedAt }).where(eq(syncEvents.id, eventId));
  }
}

export function toSyncEventPayload(record: SyncEventRecord, deviceId: string): SyncEventPayload {
  return {
    id: record.id,
    deviceId,
    table: record.tableName,
    rowId: record.rowId,
    action: record.action,
    payload: JSON.parse(record.payloadJson) as Record<string, unknown>,
    createdAt: record.createdAt,
  };
}

export async function buildPendingSyncExportPayload(): Promise<SyncEventPayload[]> {
  const deviceId = await getDeviceId();
  const pending = await listPendingOutboundSyncEvents();
  return pending.map((event) => toSyncEventPayload(event, deviceId));
}
