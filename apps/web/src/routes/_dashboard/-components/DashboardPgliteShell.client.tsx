import { SyncActivityToastListener } from "@/features/sync/components/SyncActivityToastListener";
import { ensureKaruraMap } from "@/data-access-layer/pglite/seed";
import { useSyncEventsPoller } from "@/hooks/useSyncEventsPoller";
import { PgliteProvider, usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { createContext, use, useEffect, useState, type ReactNode } from "react";

type DashboardMapContextValue = {
  mapId: number | null;
  mapInitError: string | null;
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
  const [mapId, setMapId] = useState<number | null>(null);
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureKaruraMap(db)
      .then((id) => {
        if (!cancelled) {
          setMapId(id);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setMapInitError(
            cause instanceof Error ? cause.message : "Failed to initialize map database.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  useSyncEventsPoller({ db, mapId, enabled: mapId != null });

  return (
    <DashboardMapContext value={{ mapId, mapInitError }}>
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
