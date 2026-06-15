import type { DrizzleDB } from "@/lib/drizzle/client";
import { pullSyncEvents } from "@/lib/sync/pull-sync-events";
import { seedSyncEventsFromAsset } from "@/lib/sync/seed-sync-events";
import { snapshotDatabaseSyncEventsToReplayCache } from "@/lib/sync/sync-replay-cache";
import { syncLog, syncWarn } from "@/lib/sync/sync-log";
import { getSyncApiBaseUrl } from "@/services/sync/sync.api";

export async function bootstrapSyncData(database: DrizzleDB) {
  const localResult = await seedSyncEventsFromAsset(database);
  syncLog("bootstrap local seed", localResult);

  if (!getSyncApiBaseUrl()) {
    syncLog("bootstrap remote skipped", { reason: "EXPO_PUBLIC_SYNC_API_URL not set" });
    return localResult;
  }

  try {
    const remoteResult = await pullSyncEvents(database);
    await snapshotDatabaseSyncEventsToReplayCache(database);
    const result = {
      seeded: localResult.seeded,
      applied: localResult.applied + remoteResult.applied,
      remoteProcessed: remoteResult.processed,
    };
    syncLog("bootstrap complete", result);
    return result;
  } catch (error) {
    syncWarn("bootstrap remote pull failed, continuing with local seed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return localResult;
  }
}
