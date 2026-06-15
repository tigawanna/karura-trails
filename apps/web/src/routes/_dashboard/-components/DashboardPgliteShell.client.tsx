import { SyncActivityToastListener } from "@/features/sync/components/SyncActivityToastListener";
import { ensureKaruraMap } from "@/data-access-layer/pglite/seed";
import { useSyncEventsPoller } from "@/hooks/useSyncEventsPoller";
import { PgliteProvider, usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { initPgliteDb, subscribePgliteReady } from "@/lib/pglite/pglite-instance.client";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

type DashboardMapContextValue = {
  mapId: number | null;
  mapInitError: string | null;
  refreshKaruraMap: () => Promise<number>;
};

const DashboardMapContext = createContext<DashboardMapContextValue | null>(null);

export function DashboardPgliteShell({ children }: { children: ReactNode }) {
  return (
    <PgliteProvider>
      <DashboardPgliteRuntime>{children}</DashboardPgliteRuntime>
    </PgliteProvider>
  );
}

function DashboardPgliteRuntime({ children }: { children: ReactNode }) {
  const { db } = usePglite();
  const queryClient = useQueryClient();
  const [mapId, setMapId] = useState<number | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  const refreshKaruraMap = useCallback(async () => {
    setMapInitError(null);
    setMapId(null);
    await initPgliteDb();
    const id = await ensureKaruraMap(db);
    setMapId(id);
    await queryClient.invalidateQueries({ queryKey: ["pglite"] });
    return id;
  }, [db, queryClient]);

  useEffect(() => {
    let cancelled = false;

    void refreshKaruraMap().catch((cause: unknown) => {
      if (!cancelled) {
        setMapInitError(
          cause instanceof Error ? cause.message : "Failed to initialize map database.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKaruraMap]);

  useEffect(() => {
    return subscribePgliteReady(() => {
      void refreshKaruraMap().catch((cause: unknown) => {
        setMapInitError(
          cause instanceof Error ? cause.message : "Failed to initialize map database.",
        );
      });
    });
  }, [refreshKaruraMap]);

  useSyncEventsPoller({ db, mapId, enabled: mapId != null });

  return (
    <DashboardMapContext value={{ mapId, mapInitError, refreshKaruraMap }}>
      <SyncActivityToastListener />
      {children}
    </DashboardMapContext>
  );
}

export function useDashboardMap() {
  const context = use(DashboardMapContext);
  if (!context) {
    throw new Error("useDashboardMap must be used within DashboardPgliteShell");
  }
  return context;
}
