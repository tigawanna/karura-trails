import { useMapExplorerStore } from "@/features/map/store/map-explorer-store";
import { segmentGroupColor } from "@/lib/map/segment-utils";
import type { MapPathGroupSummary } from "@/lib/map/group-segments-by-path";
import type { VirtualPathPreview } from "@/lib/map/virtual-graph-preview.types";
import { cn } from "@/lib/utils";
import { Network, RefreshCw, X } from "lucide-react";
import { useMemo } from "react";

type MapGraphPreviewPanelProps = {
  pathGroups: MapPathGroupSummary[];
  previews: Map<string, VirtualPathPreview>;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onClose: () => void;
};

export function MapGraphPreviewPanel({
  pathGroups,
  previews,
  loading,
  error,
  onReload,
  onClose,
}: MapGraphPreviewPanelProps) {
  const graphPreviewVisibleSlugs = useMapExplorerStore((state) => state.graphPreviewVisibleSlugs);
  const toggleGraphPreviewSlug = useMapExplorerStore((state) => state.toggleGraphPreviewSlug);
  const setGraphPreviewVisibleSlugs = useMapExplorerStore(
    (state) => state.setGraphPreviewVisibleSlugs,
  );

  const pathSlugs = useMemo(() => pathGroups.map((group) => group.groupId), [pathGroups]);
  const visibleSlugSet = useMemo(
    () => new Set(graphPreviewVisibleSlugs),
    [graphPreviewVisibleSlugs],
  );

  const totals = useMemo(() => {
    let visibleEdges = 0;
    let totalEdges = 0;
    for (const group of pathGroups) {
      const preview = previews.get(group.groupId);
      const count = preview?.edgeCount ?? 0;
      totalEdges += count;
      if (visibleSlugSet.has(group.groupId)) {
        visibleEdges += count;
      }
    }
    return { visibleEdges, totalEdges };
  }, [pathGroups, previews, visibleSlugSet]);

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-l border-base-300 bg-base-100"
      data-test="graph-preview-panel"
    >
      <header className="flex items-center justify-between border-b border-base-300 px-4 py-3">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-secondary" />
          <h2 className="text-sm font-semibold">Graph preview</h2>
        </div>
        <button type="button" className="btn btn-square btn-ghost btn-xs" onClick={onClose}>
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="rounded-box bg-secondary/10 px-3 py-2 text-xs text-base-content/75">
          In-memory preview only — nothing is saved until you build segments. Toggle paths to
          compare possible segment graphs.
        </p>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-base-content/60">
            {loading
              ? "Loading previews…"
              : `${totals.visibleEdges} of ${totals.totalEdges} edges visible`}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={loading}
            onClick={onReload}
          >
            <RefreshCw className={cn("size-3.5", loading ? "animate-spin" : "")} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={pathSlugs.length === 0}
            onClick={() => setGraphPreviewVisibleSlugs(pathSlugs)}
          >
            Show all
          </button>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={graphPreviewVisibleSlugs.length === 0}
            onClick={() => setGraphPreviewVisibleSlugs([])}
          >
            Hide all
          </button>
        </div>

        {error ? <p className="text-xs text-error">{error}</p> : null}

        {pathGroups.length === 0 ? (
          <p className="text-xs text-base-content/55">No trail paths loaded yet.</p>
        ) : (
          <ul className="space-y-1">
            {pathGroups.map((group) => {
              const preview = previews.get(group.groupId);
              const checked = visibleSlugSet.has(group.groupId);
              const skippedCount = preview?.skippedMarkers.length ?? 0;

              return (
                <li key={group.groupId}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 transition-colors",
                      checked
                        ? "border-secondary/30 bg-secondary/10"
                        : "border-base-content/10 bg-base-100/40 opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs checkbox-secondary"
                      checked={checked}
                      onChange={() => toggleGraphPreviewSlug(group.groupId)}
                    />
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segmentGroupColor(group.groupId) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-semibold">
                        {group.name ?? group.groupId}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-base-content/45">
                        {group.groupId}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-base-content/50 tabular-nums">
                      {preview ? `${preview.edgeCount} edges` : "—"}
                    </span>
                  </label>
                  {checked && skippedCount > 0 ? (
                    <p className="mt-1 pl-8 text-[10px] text-warning">
                      {skippedCount} marker(s) skipped
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
