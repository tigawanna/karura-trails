import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";
import type { TrailRecord } from "@/types/map/trails";

export type MapBootstrapExport = {
  version: 2;
  exportedAt: string;
  map: {
    id: number;
    name: string;
  };
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  geoSegments: GeoSegmentRecord[];
  segmentEdges: SegmentEdgeRecord[];
  trails: TrailRecord[];
};

export function buildMapBootstrapExport(input: {
  mapId: number;
  mapName: string;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  geoSegments: GeoSegmentRecord[];
  segmentEdges: SegmentEdgeRecord[];
  trails: TrailRecord[];
}): MapBootstrapExport {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    map: { id: input.mapId, name: input.mapName },
    mapPoints: input.mapPoints,
    markerNeighbors: input.markerNeighbors,
    geoSegments: input.geoSegments,
    segmentEdges: input.segmentEdges,
    trails: input.trails,
  };
}

export function downloadJsonExport(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
