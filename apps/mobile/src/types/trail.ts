import type { PathSelect } from "@/lib/drizzle/schema";

export type TrailDifficulty = "easy" | "moderate" | "hard" | "expert";

export type TrailSurface = "dirt" | "gravel" | "paved" | "mixed";

export type TrailSource = "trailfork" | "alltrails" | "user";

export type PointCategory =
  | "junction"
  | "gate"
  | "viewpoint"
  | "rest_area"
  | "water"
  | "cave"
  | "sign"
  | "custom";

export type ElevationSource = "gps" | "inferred_from_path" | "manual";

export type HikeStatus = "planned" | "active" | "completed" | "abandoned";

export type TrailWithGeometry = Omit<PathSelect, "geom"> & {
  geom: string;
};

export interface TrailElevationProfile {
  distance: number;
  elevation: number;
}

export interface ElevationInference {
  elevation: number;
  source: ElevationSource;
  nearestPathId: number;
  nearestPathName: string;
  distanceToPath: number;
  positionOnPath: number;
}

export interface Coordinate3D {
  longitude: number;
  latitude: number;
  elevation: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}
