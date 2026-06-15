import { loadSyncEventsSeedFromAsset } from "@/lib/sync/load-sync-events-seed-asset";
import { persistSyncEventsSeed, readSyncReplayCache } from "@/lib/sync/sync-replay-cache";
import type { SyncEventsSeedJson } from "@/lib/sync/sync.types";

export { loadSyncEventsSeedFromAsset } from "@/lib/sync/load-sync-events-seed-asset";

export async function loadSyncEventsSeed(): Promise<SyncEventsSeedJson> {
  const cached = await readSyncReplayCache();
  if (cached) {
    return cached;
  }

  const assetSeed = loadSyncEventsSeedFromAsset();
  await persistSyncEventsSeed(assetSeed);
  return assetSeed;
}
