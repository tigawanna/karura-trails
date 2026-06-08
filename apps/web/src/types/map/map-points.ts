export type MapPointMetadata = Record<string, string>;

export type MapPointCategory =
  | "junction"
  | "gate"
  | "bridge"
  | "viewpoint"
  | "water"
  | "cave"
  | "rest_area"
  | "sign"
  | "bench"
  | "waterfall"
  | "custom";

export const MAP_POINT_CATEGORIES: MapPointCategory[] = [
  "junction",
  "gate",
  "bridge",
  "viewpoint",
  "water",
  "cave",
  "rest_area",
  "sign",
  "bench",
  "waterfall",
  "custom",
];

export type MapPointNodeRole = "junction" | "endpoint" | "waypoint";

export type MapPointElevationSource = "manual" | "inferred_from_path";

export type MapPointRecord = {
  id: number;
  mapId: number;
  ref: string | null;
  name: string | null;
  category: MapPointCategory;
  nodeRole: MapPointNodeRole | null;
  longitude: number;
  latitude: number;
  elevation: number | null;
  elevationSource: MapPointElevationSource | null;
  description: string | null;
  parentRef: string | null;
  sortOrder: number;
  metadata: MapPointMetadata;
  createdAt: string;
  updatedAt: string;
};

export type CreateMapPointInput = {
  mapId: number;
  longitude: number;
  latitude: number;
  ref?: string | null;
  name?: string | null;
  category?: MapPointCategory;
  nodeRole?: MapPointNodeRole | null;
  elevation?: number | null;
  elevationSource?: MapPointElevationSource | null;
  description?: string | null;
  parentRef?: string | null;
  sortOrder?: number;
  metadata?: MapPointMetadata;
};

export type UpdateMapPointInput = {
  mapId: number;
  pointId: number;
  longitude?: number;
  latitude?: number;
  ref?: string | null;
  name?: string | null;
  category?: MapPointCategory;
  nodeRole?: MapPointNodeRole | null;
  elevation?: number | null;
  elevationSource?: MapPointElevationSource | null;
  description?: string | null;
  parentRef?: string | null;
  sortOrder?: number;
  metadata?: MapPointMetadata;
};
