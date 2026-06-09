import { useHotkey } from "@tanstack/react-hotkeys";
import { asRegisterableHotkey } from "@/features/map/shortcuts/as-hotkey";
import { getShortcut, SHORTCUT_IDS } from "@/lib/shortcuts/catalog";

type UseMapExplorerHotkeysOptions = {
  enabled: boolean;
  shortcutsOpen: boolean;
  hasCaptureDraft: boolean;
  hasEditDialog: boolean;
  graphPreviewOpen: boolean;
  placementMode: boolean;
  linkMode: boolean;
  selectedMapPointId: number | null;
  pathSlugs: string[];
  onToggleNeighborCoverage: () => void;
  onToggleHideVirtualMarkers: () => void;
  onToggleSegments: () => void;
  onTogglePlacementMode: () => void;
  onToggleLinkMode: () => void;
  onToggleGraphPreview: () => void;
  onOpenMarkerEditor: () => void;
  onDismiss: () => void;
};

export function useMapExplorerHotkeys({
  enabled,
  shortcutsOpen,
  hasCaptureDraft,
  hasEditDialog,
  graphPreviewOpen,
  placementMode,
  linkMode,
  selectedMapPointId,
  onToggleNeighborCoverage,
  onToggleHideVirtualMarkers,
  onToggleSegments,
  onTogglePlacementMode,
  onToggleLinkMode,
  onToggleGraphPreview,
  onOpenMarkerEditor,
  onDismiss,
}: UseMapExplorerHotkeysOptions) {
  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.toggleNeighborCoverage).hotkey),
    onToggleNeighborCoverage,
    {
      enabled,
    },
  );

  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.toggleHideVirtualMarkers).hotkey),
    onToggleHideVirtualMarkers,
    {
      enabled,
    },
  );

  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.toggleSegments).hotkey),
    onToggleSegments,
    {
      enabled,
    },
  );

  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.togglePlacementMode).hotkey),
    onTogglePlacementMode,
    {
      enabled,
    },
  );

  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.toggleLinkMode).hotkey),
    onToggleLinkMode,
    {
      enabled,
    },
  );

  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.toggleGraphPreview).hotkey),
    onToggleGraphPreview,
    {
      enabled,
    },
  );

  useHotkey(
    asRegisterableHotkey(getShortcut(SHORTCUT_IDS.openMarkerEditor).hotkey),
    onOpenMarkerEditor,
    {
      enabled: enabled && selectedMapPointId != null,
    },
  );

  useHotkey(asRegisterableHotkey(getShortcut(SHORTCUT_IDS.dismissOverlay).hotkey), onDismiss, {
    enabled:
      shortcutsOpen ||
      (enabled &&
        (hasCaptureDraft || hasEditDialog || graphPreviewOpen || placementMode || linkMode)),
    conflictBehavior: "replace",
  });
}
