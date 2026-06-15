import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getShortcut, SHORTCUT_IDS, type ShortcutId } from "@/lib/shortcuts/catalog";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import {
  ChevronDown,
  Database,
  Download,
  HelpCircle,
  Layers,
  MoreHorizontal,
  RefreshCw,
  Search,
  Upload,
  Wrench,
} from "lucide-react";

type MapWorkspaceToolbarProps = {
  locationQuery: string;
  isSearching: boolean;
  onLocationQueryChange: (value: string) => void;
  onSearch: () => void;
  placementMode: boolean;
  onPlacementModeChange: (value: boolean) => void;
  linkMode: boolean;
  onLinkModeChange: (value: boolean) => void;
  showNeighborCoverage: boolean;
  onShowNeighborCoverageChange: (value: boolean) => void;
  showSegments: boolean;
  onShowSegmentsChange: (value: boolean) => void;
  hideVirtualMarkers: boolean;
  onHideVirtualMarkersChange: (value: boolean) => void;
  graphPreviewOpen: boolean;
  onToggleGraphPreview: () => void;
  graphPreviewDisabled: boolean;
  onImportTrails: () => void;
  importTrailsPending: boolean;
  onImportJson: () => void;
  importJsonPending: boolean;
  onExportJson: () => void;
  onFlushEvents: () => void;
  flushEventsPending: boolean;
  flushEventsDisabled: boolean;
  onSquashApproved: () => void;
  squashPending: boolean;
  onOpenShortcuts: () => void;
  onRefreshData: () => void;
};

const DROPDOWN_CONTENT_CLASS =
  "z-[2000] border-base-content/10 bg-base-100 text-base-content shadow-lg";

function MapShortcut({ shortcutId }: { shortcutId: ShortcutId }) {
  return (
    <DropdownMenuShortcut>{formatForDisplay(getShortcut(shortcutId).hotkey)}</DropdownMenuShortcut>
  );
}

export function MapWorkspaceToolbar({
  locationQuery,
  isSearching,
  onLocationQueryChange,
  onSearch,
  placementMode,
  onPlacementModeChange,
  linkMode,
  onLinkModeChange,
  showNeighborCoverage,
  onShowNeighborCoverageChange,
  showSegments,
  onShowSegmentsChange,
  hideVirtualMarkers,
  onHideVirtualMarkersChange,
  graphPreviewOpen,
  onToggleGraphPreview,
  graphPreviewDisabled,
  onImportTrails,
  importTrailsPending,
  onImportJson,
  importJsonPending,
  onExportJson,
  onFlushEvents,
  flushEventsPending,
  flushEventsDisabled,
  onSquashApproved,
  squashPending,
  onOpenShortcuts,
  onRefreshData,
}: MapWorkspaceToolbarProps) {
  const toolsActive = placementMode || linkMode;
  const viewActive = showNeighborCoverage || showSegments || hideVirtualMarkers || graphPreviewOpen;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <div className="join">
        <input
          className="input-bordered input input-sm join-item w-44 sm:w-56"
          placeholder="Search location…"
          value={locationQuery}
          onChange={(event) => onLocationQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSearch();
            }
          }}
        />
        <button
          type="button"
          className="btn join-item btn-sm"
          onClick={onSearch}
          disabled={isSearching}
          aria-label="Search location"
        >
          <Search className="size-3.5" />
        </button>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant={toolsActive ? "default" : "outline"} size="sm">
            <Wrench className="size-3.5" />
            Tools
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={`w-52 ${DROPDOWN_CONTENT_CLASS}`}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Map tools</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={placementMode}
              onCheckedChange={(checked) => onPlacementModeChange(checked === true)}
            >
              Add marker
              <MapShortcut shortcutId={SHORTCUT_IDS.togglePlacementMode} />
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={linkMode}
              onCheckedChange={(checked) => onLinkModeChange(checked === true)}
            >
              Link mode
              <MapShortcut shortcutId={SHORTCUT_IDS.toggleLinkMode} />
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant={viewActive ? "default" : "outline"} size="sm">
            <Layers className="size-3.5" />
            View
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={`w-56 ${DROPDOWN_CONTENT_CLASS}`}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Overlays</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showNeighborCoverage}
              onCheckedChange={(checked) => onShowNeighborCoverageChange(checked === true)}
            >
              Neighbor coverage
              <MapShortcut shortcutId={SHORTCUT_IDS.toggleNeighborCoverage} />
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showSegments}
              onCheckedChange={(checked) => onShowSegmentsChange(checked === true)}
            >
              Trail segments
              <MapShortcut shortcutId={SHORTCUT_IDS.toggleSegments} />
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={hideVirtualMarkers}
              onCheckedChange={(checked) => onHideVirtualMarkersChange(checked === true)}
            >
              Hide virtual markers
              <MapShortcut shortcutId={SHORTCUT_IDS.toggleHideVirtualMarkers} />
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={graphPreviewOpen}
              disabled={graphPreviewDisabled}
              data-test="graph-preview-toggle"
              onCheckedChange={() => onToggleGraphPreview()}
            >
              Graph preview
              <MapShortcut shortcutId={SHORTCUT_IDS.toggleGraphPreview} />
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Database className="size-3.5" />
            Data
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={`w-52 ${DROPDOWN_CONTENT_CLASS}`}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Import & export</DropdownMenuLabel>
            <DropdownMenuItem disabled={importTrailsPending} onSelect={onImportTrails}>
              <Upload className="size-3.5" />
              Import trails
            </DropdownMenuItem>
            <DropdownMenuItem disabled={importJsonPending} onSelect={onImportJson}>
              <Upload className="size-3.5" />
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportJson}>
              <Download className="size-3.5" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Sync</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={flushEventsPending || flushEventsDisabled}
              onSelect={onFlushEvents}
            >
              Flush events
            </DropdownMenuItem>
            <DropdownMenuItem disabled={squashPending} onSelect={onSquashApproved}>
              Squash approved
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={`w-48 ${DROPDOWN_CONTENT_CLASS}`}>
          <DropdownMenuItem onSelect={onOpenShortcuts} data-test="keyboard-shortcuts-open">
            <HelpCircle className="size-3.5" />
            Keyboard shortcuts
            <MapShortcut shortcutId={SHORTCUT_IDS.showKeyboardShortcuts} />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRefreshData}>
            <RefreshCw className="size-3.5" />
            Refresh data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
