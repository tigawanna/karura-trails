import { KeyboardShortcutsProvider } from "@/features/map/components/KeyboardShortcutsProvider";
import { MapExplorerPage } from "@/features/map/components/MapExplorerPage";
import { useDashboardMap } from "@/routes/_dashboard/-components/DashboardPgliteShell.client";
import { MainLoader } from "@/components/wrappers/MainLoader";

export default function MapShell() {
  const { mapId, mapInitError } = useDashboardMap();

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
      <MapExplorerPage mapId={mapId} />
    </KeyboardShortcutsProvider>
  );
}
