import { applySyncEvents } from "@/lib/sync/apply-sync-events";
import { readSyncPullCursor, writeSyncPullCursor } from "@/lib/sync/sync-cursor";
import type { PgliteDb } from "@/lib/pglite/client";
import type { SyncEventRecord } from "@/types/sync";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 300_000; // 300 seconds = 5 minutes

type UseSyncEventsPollerOptions = {
  db: PgliteDb | null;
  mapId: number | null;
  enabled?: boolean;
};

export function useSyncEventsPoller({ db, mapId, enabled = true }: UseSyncEventsPollerOptions) {
  const queryClient = useQueryClient();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!enabled || db == null || mapId == null || typeof Worker === "undefined") {
      return;
    }

    const worker = new Worker(new URL("../workers/sync-events-poller.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "events"; events: SyncEventRecord[]; nextCursor: string | null }
        | { type: "error"; message: string };

      if (message.type === "error") {
        return;
      }

      void (async () => {
        const result = await applySyncEvents(db, mapId, message.events);
        if (message.nextCursor) {
          writeSyncPullCursor(message.nextCursor);
        }
        if (result.applied > 0) {
          await queryClient.invalidateQueries({ queryKey: ["pglite"] });
        }
      })();
    };

    worker.postMessage({
      type: "start",
      cursor: readSyncPullCursor(),
      intervalMs: POLL_INTERVAL_MS,
    });

    return () => {
      worker.postMessage({ type: "stop" });
      worker.terminate();
      workerRef.current = null;
    };
  }, [db, enabled, mapId, queryClient]);
}
