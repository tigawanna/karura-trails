import migrations from "@/drizzle/migrations";
import type { DrizzleDB } from "@/lib/drizzle/client";
import { db, ensureSpatialMetadata, resetLocalDatabase } from "@/lib/drizzle/client";
import { backfillMarkerKinds } from "@/lib/drizzle/backfill-marker-kinds";
import {
  clearSkippedAppliedSyncEvents,
  countSkippedAppliedSyncEvents,
  countUnappliedSyncEvents,
  listUnappliedSyncEvents,
} from "@/lib/sync/applied-sync-events";
import { applySyncEvents } from "@/lib/sync/apply-sync-events";
import { loadSyncEventsSeed } from "@/lib/sync/load-sync-events-seed";
import { pullSyncEvents } from "@/lib/sync/pull-sync-events";
import {
  persistSyncEventsSeed,
  readSyncReplayCacheSummary,
  snapshotDatabaseSyncEventsToReplayCache,
} from "@/lib/sync/sync-replay-cache";
import { syncEvents } from "@/lib/drizzle/schema";
import { syncLog } from "@/lib/sync/sync-log";
import { payloadToRecord, type SyncEventRecord } from "@/lib/sync/sync.types";
import { getSyncApiBaseUrl } from "@/services/sync/sync.api";
import { migrate } from "drizzle-orm/op-sqlite/migrator";

const BATCH_SIZE = 100;
const INSERT_CHUNK_SIZE = 100;
const MAX_PASSES = 25;

export type ReloadMarkerDataResult = {
  replayEventCount: number;
  replayCacheGeneratedAt: string | null;
  applied: number;
  passes: number;
  remoteApplied: number;
  remainingUnapplied: number;
  remainingSkipped: number;
};

async function snapshotDatabaseEventsToReplayCache(database: DrizzleDB): Promise<number> {
  return snapshotDatabaseSyncEventsToReplayCache(database);
}

async function insertSeedEventsFresh(database: DrizzleDB, records: SyncEventRecord[]) {
  for (let index = 0; index < records.length; index += INSERT_CHUNK_SIZE) {
    const chunk = records.slice(index, index + INSERT_CHUNK_SIZE);
    await database.insert(syncEvents).values(
      chunk.map((event) => ({
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
    );
  }
}

async function applyUnappliedBatches(database: DrizzleDB): Promise<number> {
  let applied = 0;

  while (true) {
    const pending = await listUnappliedSyncEvents(database, BATCH_SIZE);
    if (pending.length === 0) {
      break;
    }

    const result = await applySyncEvents(database, pending);
    applied += result.applied;

    if (result.applied === 0) {
      break;
    }
  }

  return applied;
}

async function applySeedWithRetries(database: DrizzleDB): Promise<{ applied: number; passes: number }> {
  let applied = 0;
  let passes = 0;

  while (passes < MAX_PASSES) {
    const passApplied = await applyUnappliedBatches(database);
    applied += passApplied;

    if (passApplied === 0) {
      break;
    }

    const cleared = await clearSkippedAppliedSyncEvents(database);
    if (cleared === 0) {
      break;
    }

    passes += 1;
  }

  return { applied, passes };
}

async function reinitializeDatabase(): Promise<DrizzleDB> {
  resetLocalDatabase();
  await migrate(db, migrations);
  await ensureSpatialMetadata();
  return db;
}

export async function reloadMarkerData(database: DrizzleDB = db): Promise<ReloadMarkerDataResult> {
  syncLog("reload marker data start");

  await snapshotDatabaseEventsToReplayCache(database);

  const seed = await loadSyncEventsSeed();
  await persistSyncEventsSeed(seed);
  const records = seed.events.map((event) => payloadToRecord(event, true));

  await reinitializeDatabase();
  await insertSeedEventsFresh(db, records);

  const { applied, passes } = await applySeedWithRetries(db);

  let remoteApplied = 0;
  if (getSyncApiBaseUrl()) {
    try {
      const remoteResult = await pullSyncEvents(db);
      remoteApplied = remoteResult.applied;
      await snapshotDatabaseEventsToReplayCache(db);
    } catch (error) {
      syncLog("reload marker data remote pull failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await backfillMarkerKinds(db);

  const cacheSummary = await readSyncReplayCacheSummary();
  const result: ReloadMarkerDataResult = {
    replayEventCount: cacheSummary?.eventCount ?? records.length,
    replayCacheGeneratedAt: cacheSummary?.generatedAt ?? null,
    applied,
    passes,
    remoteApplied,
    remainingUnapplied: await countUnappliedSyncEvents(db),
    remainingSkipped: await countSkippedAppliedSyncEvents(db),
  };

  syncLog("reload marker data complete", result);
  return result;
}
