import { KeyboardShortcutsProvider } from "@/features/map/components/KeyboardShortcutsProvider";
import { MapExplorerPage } from "@/features/map/components/MapExplorerPage";
import { useDashboardMap } from "@/routes/_dashboard/-components/DashboardPgliteShell.client";
import { MainLoader } from "@/components/wrappers/MainLoader";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

export default function MapWorkspaceShell() {
  const { mapId: canonicalMapId, mapInitError } = useDashboardMap();
  const navigate = useNavigate();
  const mapIdParam = useParams({ strict: false }).mapId;

  useEffect(() => {
    if (canonicalMapId == null) {
      return;
    }
    if (mapIdParam !== String(canonicalMapId)) {
      void navigate({
        to: "/maps/$mapId",
        params: { mapId: String(canonicalMapId) },
        replace: true,
      });
    }
  }, [canonicalMapId, mapIdParam, navigate]);

  if (mapInitError) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
        {mapInitError}
      </div>
    );
  }

  if (canonicalMapId == null || mapIdParam !== String(canonicalMapId)) {
    return <MainLoader />;
  }

  return (
    <KeyboardShortcutsProvider>
      <MapExplorerPage mapId={canonicalMapId} variant="workspace" />
    </KeyboardShortcutsProvider>
  );
}
