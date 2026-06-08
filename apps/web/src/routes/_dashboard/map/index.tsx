import { ensureKaruraMap } from "@/data-access-layer/pglite/seed";
import { MapExplorerPage } from "@/features/map/components/MapExplorerPage";
import { usePglite } from "@/lib/pglite/components/PgliteProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MainLoader } from "@/components/wrappers/MainLoader";

export const Route = createFileRoute("/_dashboard/map/")({
  component: MapRoutePage,
  ssr: false,
});

function MapRoutePage() {
  const { db } = usePglite();
  const [mapId, setMapId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setError(cause instanceof Error ? cause.message : "Failed to initialize map database.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

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

  return <MapExplorerPage mapId={mapId} />;
}
