import { ensureKaruraMap } from "@/data-access-layer/pglite/seed";
import { KeyboardShortcutsProvider } from "@/features/map/components/KeyboardShortcutsProvider";
import { MapExplorerPage } from "@/features/map/components/MapExplorerPage";
import { useSyncEventsPoller } from "@/hooks/useSyncEventsPoller";
import { PgliteProvider, usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MainLoader } from "@/components/wrappers/MainLoader";

export default function MapWorkspaceShell() {
  return (
    <PgliteProvider>
      <MapWorkspaceShellContent />
    </PgliteProvider>
  );
}

function MapWorkspaceShellContent() {
  const { db } = usePglite();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const mapIdParam = params.mapId;
  const [mapId, setMapId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureKaruraMap(db)
      .then((resolvedId) => {
        if (cancelled) {
          return;
        }
        if (mapIdParam == null) {
          void navigate({
            to: "/maps/$mapId",
            params: { mapId: String(resolvedId) },
            replace: true,
          });
          return;
        }
        const parsed = Number(mapIdParam);
        if (!Number.isFinite(parsed)) {
          void navigate({
            to: "/maps/$mapId",
            params: { mapId: String(resolvedId) },
            replace: true,
          });
          return;
        }
        setMapId(parsed);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to initialize map database.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db, mapIdParam, navigate]);

  useSyncEventsPoller({ db, mapId, enabled: mapId != null });

  if (error) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
        {error}
      </div>
    );
  }

  if (mapId == null) {
    return <MainLoader />;
  }

  return (
    <KeyboardShortcutsProvider>
      <MapExplorerPage mapId={mapId} variant="workspace" />
    </KeyboardShortcutsProvider>
  );
}
