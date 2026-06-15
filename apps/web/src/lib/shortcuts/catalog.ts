import type { MapTipItem, ShortcutDefinition } from "@/lib/shortcuts/types";

export const SHORTCUT_IDS = {
  showKeyboardShortcuts: "show-keyboard-shortcuts",
  toggleNeighborCoverage: "toggle-neighbor-coverage",
  toggleHideVirtualMarkers: "toggle-hide-virtual-markers",
  toggleSegments: "toggle-segments",
  togglePlacementMode: "toggle-placement-mode",
  toggleLinkMode: "toggle-link-mode",
  toggleGraphPreview: "toggle-graph-preview",
  openMarkerEditor: "open-marker-editor",
  dismissOverlay: "dismiss-overlay",
  linkChainPick: "link-chain-pick",
  dragMarker: "drag-marker",
} as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[keyof typeof SHORTCUT_IDS];

function defineShortcut(
  id: ShortcutId,
  hotkey: string,
  label: string,
  categories: ShortcutDefinition["categories"],
): ShortcutDefinition {
  return { id, hotkey, label, categories };
}

export const SHORTCUT_CATALOG: readonly ShortcutDefinition[] = [
  defineShortcut(SHORTCUT_IDS.showKeyboardShortcuts, "Shift+?", "Show keyboard shortcuts", [
    "global",
  ]),
  defineShortcut(
    SHORTCUT_IDS.toggleNeighborCoverage,
    "Mod+Shift+N",
    "Toggle neighbor coverage overlay",
    ["mapWorkspace"],
  ),
  defineShortcut(
    SHORTCUT_IDS.toggleHideVirtualMarkers,
    "Mod+Shift+V",
    "Toggle virtual marker visibility",
    ["mapWorkspace"],
  ),
  defineShortcut(SHORTCUT_IDS.toggleSegments, "Mod+Shift+S", "Toggle trail segments overlay", [
    "mapWorkspace",
  ]),
  defineShortcut(SHORTCUT_IDS.togglePlacementMode, "P", "Toggle add-marker mode", ["mapWorkspace"]),
  defineShortcut(SHORTCUT_IDS.toggleLinkMode, "L", "Toggle link mode", ["mapWorkspace"]),
  defineShortcut(SHORTCUT_IDS.toggleGraphPreview, "G", "Toggle graph preview panel", [
    "mapWorkspace",
  ]),
  defineShortcut(SHORTCUT_IDS.openMarkerEditor, "Mod+Shift+E", "Edit selected marker", [
    "mapWorkspace",
  ]),
  defineShortcut(SHORTCUT_IDS.dismissOverlay, "Escape", "Close dialog or cancel mode", [
    "mapWorkspace",
  ]),
  defineShortcut(
    SHORTCUT_IDS.linkChainPick,
    "Mod+Click",
    "Add marker or extend link chain (link mode on)",
    ["mapTips"],
  ),
  defineShortcut(
    SHORTCUT_IDS.dragMarker,
    "Hold Mod",
    "Drag a marker to reposition (outside link mode)",
    ["mapTips"],
  ),
];

export function getCatalogEntriesForCategory(
  category: ShortcutDefinition["categories"][number],
): ShortcutDefinition[] {
  return SHORTCUT_CATALOG.filter((entry) => entry.categories.includes(category));
}

export function getShortcutHotkeys(id: ShortcutId): string[] {
  return SHORTCUT_CATALOG.filter((entry) => entry.id === id).map((entry) => entry.hotkey);
}

export function getShortcut(id: ShortcutId): ShortcutDefinition {
  const entry = SHORTCUT_CATALOG.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Unknown shortcut id: ${id}`);
  }
  return entry;
}

export const MAP_TIP_ITEMS: MapTipItem[] = [
  {
    label:
      "Green dashed lines — neighbor links when coverage overlay is on (Ctrl+Shift+N or toolbar).",
    swatch: "green-diamond",
  },
  {
    label: "Teal ring — natural endpoint (endpoint node with one neighbor).",
    swatch: "teal-endpoint",
  },
  {
    label: "Purple ring with × — unexpected dead end (one neighbor, not an endpoint).",
    swatch: "purple-dead-end",
  },
  {
    label: "Amber glow — marker has no neighbor links yet.",
    swatch: "amber-glow",
  },
  {
    label:
      "Dashed colored paths in graph preview — virtual segment proposals (not saved until you build).",
    swatch: "dash-preview",
  },
  {
    label:
      "Drop a marker between two linked neighbors to get an inferred name and optional rewire.",
  },
  {
    label:
      "Rename tab — analyze legacy labels like 21.a1 and approve batch renames before applying.",
  },
];
