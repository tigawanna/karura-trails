import { KeyboardShortcutsProvider } from "@/features/map/components/KeyboardShortcutsProvider";
import { MapExplorerPage } from "@/features/map/components/MapExplorerPage";
import { useDashboardMap } from "@/routes/_dashboard/-components/DashboardPgliteShell.client";
import { MainLoader } from "@/components/wrappers/MainLoader";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export default function MapWorkspaceShell() {
  const { mapId: defaultMapId, mapInitError } = useDashboardMap();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const mapIdParam = params.mapId;
  const [mapId, setMapId] = useState<number | null>(null);

  useEffect(() => {
    if (defaultMapId == null) {
      return;
    }
    if (mapIdParam == null) {
      void navigate({
        to: "/maps/$mapId",
        params: { mapId: String(defaultMapId) },
        replace: true,
      });
      return;
    }
    const parsed = Number(mapIdParam);
    if (!Number.isFinite(parsed)) {
      void navigate({
        to: "/maps/$mapId",
        params: { mapId: String(defaultMapId) },
        replace: true,
      });
      return;
    }
    setMapId(parsed);
  }, [defaultMapId, mapIdParam, navigate]);

  if (mapInitError) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
        {mapInitError}
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
