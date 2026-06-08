import { useMapExplorerStore } from "@/features/map/store/map-explorer-store";
import { cn } from "@/lib/utils";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MapDataExplorerTab } from "@/types/map/maps";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";

const TABS: { id: MapDataExplorerTab; label: string }[] = [
  { id: "points", label: "Points" },
  { id: "segments", label: "Segments" },
  { id: "links", label: "Links" },
  { id: "events", label: "Local events" },
];

type MapExplorerTablesProps = {
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  segmentEdges: SegmentEdgeRecord[];
  pendingEventCount: number;
  localEvents: Array<{
    id: string;
    tableName: string;
    action: string;
    createdAt: Date;
    flushed: boolean;
  }>;
};

function selectRowClass(isSelected: boolean) {
  return cn(
    "cursor-pointer transition-colors",
    isSelected ? "bg-primary/12 hover:bg-primary/16" : "hover:bg-base-200/60",
  );
}

export function MapExplorerTables({
  mapPoints,
  geoSegments,
  segmentEdges,
  pendingEventCount,
  localEvents,
}: MapExplorerTablesProps) {
  const tab = useMapExplorerStore((state) => state.tab);
  const selection = useMapExplorerStore((state) => state.selection);
  const setTab = useMapExplorerStore((state) => state.setTab);
  const setSelection = useMapExplorerStore((state) => state.setSelection);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-base-content/10 px-2 py-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={cn("btn btn-xs", tab === entry.id ? "btn-primary" : "btn-ghost")}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
            {entry.id === "events" && pendingEventCount > 0 ? (
              <span className="badge badge-sm">{pendingEventCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {tab === "points" ? (
          <div className="overflow-x-auto rounded-box border border-base-content/10">
            <table className="table-pin-rows table table-sm">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Lat</th>
                  <th>Lng</th>
                </tr>
              </thead>
              <tbody>
                {mapPoints.map((point) => (
                  <tr
                    key={point.id}
                    className={selectRowClass(
                      selection?.kind === "map-point" && selection.id === point.id,
                    )}
                    onClick={() => setSelection({ kind: "map-point", id: point.id })}
                  >
                    <td>{point.ref ?? "—"}</td>
                    <td>{point.name ?? "—"}</td>
                    <td>{point.category}</td>
                    <td>{point.latitude.toFixed(5)}</td>
                    <td>{point.longitude.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mapPoints.length === 0 ? (
              <p className="px-3 py-6 text-sm text-base-content/50">No markers yet.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "segments" ? (
          <div className="overflow-x-auto rounded-box border border-base-content/10">
            <table className="table-pin-rows table table-sm">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Name</th>
                  <th>Index</th>
                  <th>Vertices</th>
                </tr>
              </thead>
              <tbody>
                {geoSegments.map((segment) => (
                  <tr
                    key={segment.id}
                    className={selectRowClass(
                      selection?.kind === "segment" && selection.id === segment.id,
                    )}
                    onClick={() => setSelection({ kind: "segment", id: segment.id })}
                  >
                    <td>{segment.segmentGroupId}</td>
                    <td>{segment.name ?? "—"}</td>
                    <td>{segment.segmentIndex}</td>
                    <td>{segment.geometryJson.coordinates.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {geoSegments.length === 0 ? (
              <p className="px-3 py-6 text-sm text-base-content/50">No segments yet.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "links" ? (
          <div className="overflow-x-auto rounded-box border border-base-content/10">
            <table className="table-pin-rows table table-sm">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Path</th>
                  <th>Length</th>
                </tr>
              </thead>
              <tbody>
                {segmentEdges.map((edge) => (
                  <tr
                    key={edge.id}
                    className={selectRowClass(
                      selection?.kind === "segment-edge" && selection.id === edge.id,
                    )}
                    onClick={() => setSelection({ kind: "segment-edge", id: edge.id })}
                  >
                    <td>{edge.fromRef}</td>
                    <td>{edge.toRef}</td>
                    <td>{edge.pathSlug}</td>
                    <td>{edge.lengthM != null ? edge.lengthM.toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {segmentEdges.length === 0 ? (
              <p className="px-3 py-6 text-sm text-base-content/50">No links yet.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "events" ? (
          <div className="overflow-x-auto rounded-box border border-base-content/10">
            <table className="table-pin-rows table table-sm">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Action</th>
                  <th>Created</th>
                  <th>Flushed</th>
                </tr>
              </thead>
              <tbody>
                {localEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{event.tableName}</td>
                    <td>{event.action}</td>
                    <td>{event.createdAt.toLocaleString()}</td>
                    <td>{event.flushed ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {localEvents.length === 0 ? (
              <p className="px-3 py-6 text-sm text-base-content/50">No local events recorded.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
