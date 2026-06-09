import { getLatestAppliedSyncEventId } from "@/data-access-layer/pglite/applied-sync-events";
import { applySyncEvents } from "@/lib/sync/apply-sync-events";
import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import type { PgliteDb } from "@/lib/pglite/client";
import { fetchSyncEventsPull } from "@/services/sync/sync.api";
import type { QueryClient } from "@tanstack/react-query";

const POLL_BATCH_LIMIT = 100;

type PullSyncEventsInput = {
  db: PgliteDb;
  mapId: number;
  queryClient: QueryClient;
};

export async function pullSyncEvents({ db, mapId, queryClient }: PullSyncEventsInput) {
  const store = useSyncActivityStore.getState();
  if (store.status === "syncing") {
    return { applied: 0, processed: 0 };
  }

  store.startSync();

  let cursor = await getLatestAppliedSyncEventId(db);
  let hasMore = true;
  let page = 0;
  let totalApplied = 0;
  let totalProcessed = 0;

  try {
    while (hasMore) {
      const response = await fetchSyncEventsPull(cursor, page + 1, POLL_BATCH_LIMIT);
      page = response.page;

      if (response.events.length > 0) {
        const result = await applySyncEvents(db, mapId, response.events);
        totalApplied += result.applied;
        totalProcessed += response.events.length;
        cursor = response.nextCursor ?? response.events[response.events.length - 1]?.id ?? cursor;

        store.updateProgress({
          currentPage: response.page,
          totalPages: response.totalPages,
          perPage: response.perPage,
          totalCount: response.totalCount,
          remainingCount: response.remainingCount,
          batchEvents: response.events,
          batchApplied: result.applied,
          eventsProcessed: totalProcessed,
          eventsApplied: totalApplied,
        });
      }

      hasMore = response.hasMore;
    }

    store.finishSync();

    if (totalApplied > 0) {
      await queryClient.invalidateQueries({ queryKey: ["pglite"] });
      await queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    }

    return { applied: totalApplied, processed: totalProcessed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync pull failed";
    store.setError(message);
    throw error;
  }
}
