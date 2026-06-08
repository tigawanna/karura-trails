import { MapLandmarkTypesTable } from "@/features/map/components/MapLandmarkTypesTable";
import { SegmentBuildFromPathPanel } from "@/features/map/components/SegmentBuildFromPathPanel";
import { useMapExplorerStore } from "@/features/map/store/map-explorer-store";
import type { PgliteDb } from "@/lib/pglite/client";
import { cn } from "@/lib/utils";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapLandmarkTypeRecord } from "@/types/map/landmark-types";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MapDataExplorerTab } from "@/types/map/maps";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";
import type { ReactNode } from "react";

const TABS: { id: MapDataExplorerTab; label: string }[] = [
  { id: "points", label: "Points" },
  { id: "landmarks", label: "Landmarks" },
  { id: "segments", label: "Segments" },
  { id: "links", label: "Links" },
  { id: "route", label: "Route" },
  { id: "events", label: "Local events" },
];

type MapExplorerTablesProps = {
  db: PgliteDb;
  mapId: number;
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  segmentEdges: SegmentEdgeRecord[];
  landmarkTypes: MapLandmarkTypeRecord[];
  pendingEventCount: number;
  localEvents: Array<{
    id: string;
    tableName: string;
    action: string;
    createdAt: Date;
    flushed: boolean;
  }>;
  pathSlug: string;
  onPathSlugChange: (pathSlug: string) => void;
  onSegmentsBuilt?: () => void;
  routePanel?: ReactNode;
};

function selectRowClass(isSelected: boolean) {
  return cn(
    "cursor-pointer transition-colors",
    isSelected ? "bg-primary/12 hover:bg-primary/16" : "hover:bg-base-200/60",
  );
}

export function MapExplorerTables({
  db,
  mapId,
  mapPoints,
  geoSegments,
  segmentEdges,
  landmarkTypes,
  pendingEventCount,
  localEvents,
  pathSlug,
  onPathSlugChange,
  onSegmentsBuilt,
  routePanel,
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

        {tab === "landmarks" ? (
          <MapLandmarkTypesTable db={db} mapId={mapId} landmarkTypes={landmarkTypes} />
        ) : null}

        {tab === "segments" ? (
          <div className="space-y-4">
            <SegmentBuildFromPathPanel
              db={db}
              mapId={mapId}
              geoSegments={geoSegments}
              pathSlug={pathSlug}
              onPathSlugChange={onPathSlugChange}
              onBuilt={onSegmentsBuilt}
              showPathSelect
            />
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

        {tab === "route" ? routePanel : null}

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
