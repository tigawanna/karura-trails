export type {
  TrailDifficulty,
  TrailSurface,
  TrailSource,
  PointCategory,
  ElevationSource,
  HikeStatus,
  TrailElevationProfile,
  ElevationInference,
  Coordinate3D,
  BoundingBox,
} from "./trail";

export type {
  LineStringGeometry,
  PointGeometry,
  TrailGeometry,
  TrailFeatureProperties,
  TrailFeature,
  TrailFeatureCollection,
  ParsedGeometry,
} from "./geojson";

export { KARURA_FOREST_CENTER, KARURA_FOREST_BBOX, KARURA_DEFAULT_ZOOM } from "./map";
export type { MapCamera, MapViewport } from "./map";
