import type { DrizzleDB } from "@/lib/drizzle/client";
import { syncEvents } from "@/lib/drizzle/schema";
import {
  countUnappliedSyncEvents,
  isSyncBootstrapComplete,
  listUnappliedSyncEvents,
} from "@/lib/sync/applied-sync-events";
import { applySyncEvents } from "@/lib/sync/apply-sync-events";
import { loadSyncEventsSeed } from "@/lib/sync/load-sync-events-seed";
import { persistSyncEventsSeed, snapshotDatabaseSyncEventsToReplayCache } from "@/lib/sync/sync-replay-cache";
import { payloadToRecord } from "@/lib/sync/sync.types";
import { count } from "drizzle-orm";

const BATCH_SIZE = 100;

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

export async function ensureSeedEventsInDatabase(database: DrizzleDB): Promise<number> {
  const seed = await loadSyncEventsSeed();
  await persistSyncEventsSeed(seed);
  const records = seed.events.map((event) => payloadToRecord(event, true));
  await upsertLocalSeedEvents(database, records);
  return records.length;
}

export async function seedSyncEventsFromAsset(database: DrizzleDB) {
  const [syncCountRow] = await database.select({ count: count() }).from(syncEvents);
  const syncCount = syncCountRow?.count ?? 0;

  if (syncCount > 0 && (await isSyncBootstrapComplete(database))) {
    await snapshotDatabaseSyncEventsToReplayCache(database);
    return { seeded: 0, applied: 0 };
  }

  const seed = await loadSyncEventsSeed();
  await persistSyncEventsSeed(seed);
  const records = seed.events.map((event) => payloadToRecord(event, true));

  if (syncCount < seed.events.length || (await countUnappliedSyncEvents(database)) > 0) {
    await upsertLocalSeedEvents(database, records);
  }

  let totalApplied = 0;

  while (true) {
    const pendingRows = await listUnappliedSyncEvents(database, BATCH_SIZE);
    if (pendingRows.length === 0) {
      break;
    }

    const result = await applySyncEvents(database, pendingRows);
    totalApplied += result.applied;
  }

  await snapshotDatabaseSyncEventsToReplayCache(database);

  return { seeded: records.length, applied: totalApplied };
}
