export type MapBaseMapStyle = "outline" | "standard" | "satellite";

export type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type MapWorkspaceState = {
  id: number;
  name: string;
  description: string | null;
  locationQuery: string | null;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  mapZoom: number | null;
  baseMapStyle: MapBaseMapStyle;
};

export type MapDataExplorerTab =
  | "points"
  | "landmarks"
  | "segments"
  | "links"
  | "trails"
  | "route"
  | "rename"
  | "events";

export type MapDataExplorerSelection =
  | { kind: "map-point"; id: number }
  | { kind: "segment"; id: number }
  | { kind: "segment-edge"; id: number }
  | { kind: "trail"; id: number };
