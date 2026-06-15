import type { DrizzleDB } from "@/lib/drizzle/client";
import { syncEvents } from "@/lib/drizzle/schema";
import { applySyncEvents } from "@/lib/sync/apply-sync-events";
import { getLatestAppliedSyncEventId } from "@/lib/sync/applied-sync-events";
import { syncLog } from "@/lib/sync/sync-log";
import type { SyncEventRecord } from "@/lib/sync/sync.types";
import { fetchSyncEventsPull } from "@/services/sync/sync.api";

const PULL_BATCH_LIMIT = 100;

async function upsertPulledEvents(database: DrizzleDB, events: SyncEventRecord[]) {
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
        syncedAt: new Date().toISOString(),
      })),
    )
    .onConflictDoNothing({ target: syncEvents.id });
}

export async function pullSyncEvents(database: DrizzleDB) {
  syncLog("pull start");
  let cursor = await getLatestAppliedSyncEventId(database);
  let hasMore = true;
  let batchNumber = 0;
  let totalApplied = 0;
  let totalProcessed = 0;

  while (hasMore) {
    const response = await fetchSyncEventsPull(cursor, 1, PULL_BATCH_LIMIT);

    if (response.events.length > 0) {
      batchNumber += 1;
      await upsertPulledEvents(database, response.events);
      const result = await applySyncEvents(database, response.events);
      totalApplied += result.applied;
      totalProcessed += response.events.length;
      cursor = response.nextCursor ?? response.events[response.events.length - 1]?.id ?? cursor;
      syncLog("pull batch applied", {
        batchNumber,
        processed: response.events.length,
        applied: result.applied,
        remaining: response.remainingCount,
        cursor,
      });
    } else {
      break;
    }

    hasMore = response.hasMore;
  }

  syncLog("pull complete", { processed: totalProcessed, applied: totalApplied });
  return { applied: totalApplied, processed: totalProcessed };
}
