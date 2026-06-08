import { Button } from "@/components/ui/button";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MapDataExplorerSelection } from "@/types/map/maps";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";
import { Pencil } from "lucide-react";

type MapExplorerDetailsPanelProps = {
  selection: MapDataExplorerSelection | null;
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  segmentEdges: SegmentEdgeRecord[];
  onEditPoint: (pointId: number) => void;
};

export function MapExplorerDetailsPanel({
  selection,
  mapPoints,
  geoSegments,
  segmentEdges,
  onEditPoint,
}: MapExplorerDetailsPanelProps) {
  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-base-content/50">
        Select a row or map marker to inspect details.
      </div>
    );
  }

  if (selection.kind === "map-point") {
    const point = mapPoints.find((entry) => entry.id === selection.id);
    if (!point) {
      return (
        <div className="p-4 text-sm text-base-content/50">Marker not found in local dataset.</div>
      );
    }

    return (
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{point.name ?? point.ref ?? `Point ${point.id}`}</h3>
            <p className="text-sm text-base-content/60">{point.category}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onEditPoint(point.id)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-base-content/50">Ref</dt>
          <dd>{point.ref ?? "—"}</dd>
          <dt className="text-base-content/50">Coordinates</dt>
          <dd>
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </dd>
          <dt className="text-base-content/50">Elevation</dt>
          <dd>{point.elevation != null ? `${point.elevation} m` : "—"}</dd>
          <dt className="text-base-content/50">Description</dt>
          <dd>{point.description ?? "—"}</dd>
        </dl>
      </div>
    );
  }

  if (selection.kind === "segment") {
    const segment = geoSegments.find((entry) => entry.id === selection.id);
    if (!segment) {
      return <div className="p-4 text-sm text-base-content/50">Segment not found.</div>;
    }

    return (
      <div className="space-y-3 p-4">
        <h3 className="font-semibold">{segment.name ?? segment.segmentGroupId}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-base-content/50">Group</dt>
          <dd>{segment.segmentGroupId}</dd>
          <dt className="text-base-content/50">Index</dt>
          <dd>{segment.segmentIndex}</dd>
          <dt className="text-base-content/50">Status</dt>
          <dd>{segment.status}</dd>
          <dt className="text-base-content/50">Vertices</dt>
          <dd>{segment.geometryJson.coordinates.length}</dd>
        </dl>
      </div>
    );
  }

  if (selection.kind === "segment-edge") {
    const edge = segmentEdges.find((entry) => entry.id === selection.id);
    if (!edge) {
      return <div className="p-4 text-sm text-base-content/50">Link not found.</div>;
    }

    return (
      <div className="space-y-3 p-4">
        <h3 className="font-semibold">
          {edge.fromRef} → {edge.toRef}
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-base-content/50">Path</dt>
          <dd>{edge.pathSlug}</dd>
          <dt className="text-base-content/50">Length</dt>
          <dd>{edge.lengthM != null ? `${edge.lengthM.toFixed(1)} m` : "—"}</dd>
          <dt className="text-base-content/50">Status</dt>
          <dd>{edge.status}</dd>
        </dl>
      </div>
    );
  }

  return null;
}
