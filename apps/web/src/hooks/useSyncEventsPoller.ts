import { pullSyncEvents } from "@/lib/sync/pull-sync-events";
import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import type { PgliteDb } from "@/lib/pglite/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 30_000;

type UseSyncEventsPollerOptions = {
  db: PgliteDb | null;
  mapId: number | null;
  enabled?: boolean;
};

export function useSyncEventsPoller({ db, mapId, enabled = true }: UseSyncEventsPollerOptions) {
  const queryClient = useQueryClient();
  const registerTrigger = useSyncActivityStore((state) => state.registerTrigger);
  const runningRef = useRef(false);

  const runSync = useCallback(async () => {
    if (runningRef.current || db == null || mapId == null) {
      return;
    }
    runningRef.current = true;
    try {
      await pullSyncEvents({ db, mapId, queryClient });
    } catch {
      return;
    } finally {
      runningRef.current = false;
    }
  }, [db, mapId, queryClient]);

  useEffect(() => {
    registerTrigger(runSync);
    return () => registerTrigger(null);
  }, [registerTrigger, runSync]);

  useEffect(() => {
    if (!enabled || db == null || mapId == null) {
      return;
    }

    void runSync();
    const timer = window.setInterval(() => {
      void runSync();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [db, enabled, mapId, runSync]);
}
