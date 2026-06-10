import type { DrizzleDB } from "@/lib/drizzle/client";
import { pullSyncEvents } from "@/lib/sync/pull-sync-events";
import { seedSyncEventsFromAsset } from "@/lib/sync/seed-sync-events";
import { getSyncApiBaseUrl } from "@/services/sync/sync.api";

export async function bootstrapSyncData(database: DrizzleDB) {
  const localResult = await seedSyncEventsFromAsset(database);

  if (!getSyncApiBaseUrl()) {
    return localResult;
  }

  try {
    const remoteResult = await pullSyncEvents(database);
    return {
      seeded: localResult.seeded,
      applied: localResult.applied + remoteResult.applied,
      remoteProcessed: remoteResult.processed,
    };
  } catch (error) {
    console.warn(
      "[bootstrapSyncData] remote pull failed, continuing with local seed:",
      error instanceof Error ? error.message : error,
    );
    return localResult;
  }
}
