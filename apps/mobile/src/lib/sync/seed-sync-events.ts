import type { DrizzleDB } from "@/lib/drizzle/client";
import { syncEvents } from "@/lib/drizzle/schema";
import { applySyncEvents } from "@/lib/sync/apply-sync-events";
import { getLatestAppliedSyncEventId } from "@/lib/sync/applied-sync-events";
import { loadSyncEventsSeed } from "@/lib/sync/load-sync-events-seed";
import { payloadToRecord, type SyncEventRecord } from "@/lib/sync/sync.types";
import { asc, gt } from "drizzle-orm";

async function upsertLocalSeedEvents(database: DrizzleDB, events: SyncEventRecord[]) {
  if (events.length === 0) {
    return;
  }

  await database
    .insert(syncEvents)
    .values(
      events.map((event) => ({
        id: event.id,
        deviceId: event.deviceId,
        tableName: event.tableName,
        rowId: event.rowId,
        action: event.action,
        payloadJson: event.payloadJson,
        createdAt: event.createdAt,
        verified: event.verified,
        verifiedAt: event.verifiedAt,
        verifiedBy: event.verifiedBy,
      })),
    )
    .onConflictDoNothing({ target: syncEvents.id });
}

async function listPendingEvents(database: DrizzleDB, afterId: string | null) {
  if (afterId) {
    return database
      .select()
      .from(syncEvents)
      .where(gt(syncEvents.id, afterId))
      .orderBy(asc(syncEvents.id));
  }

  return database.select().from(syncEvents).orderBy(asc(syncEvents.id));
}

function toSyncEventRecord(row: typeof syncEvents.$inferSelect): SyncEventRecord {
  return {
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
  };
}

export async function seedSyncEventsFromAsset(database: DrizzleDB) {
  const seed = loadSyncEventsSeed();
  const records = seed.events.map((event) => payloadToRecord(event, true));
  await upsertLocalSeedEvents(database, records);

  let cursor = await getLatestAppliedSyncEventId(database);
  let totalApplied = 0;

  while (true) {
    const pendingRows = await listPendingEvents(database, cursor);
    if (pendingRows.length === 0) {
      break;
    }

    const pending = pendingRows.map(toSyncEventRecord);
    const result = await applySyncEvents(database, pending);
    totalApplied += result.applied;
    cursor = pending[pending.length - 1]?.id ?? cursor;
  }

  return { seeded: records.length, applied: totalApplied };
}
