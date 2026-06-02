import type { BoundingBox } from "./trail";

export interface MapCamera {
  centerCoordinate: [number, number];
  zoomLevel: number;
  animationDuration: number;
}

export interface MapViewport extends BoundingBox {
  zoom: number;
}

export const KARURA_FOREST_CENTER: [number, number] = [36.8193, -1.2376];

export const KARURA_FOREST_BBOX: BoundingBox = {
  minLng: 36.7944,
  minLat: -1.25081,
  maxLng: 36.84418,
  maxLat: -1.22436,
};

export const KARURA_DEFAULT_ZOOM = 13.5;

export const OPENFREEMAP_POSITRON_STYLE = "https://tiles.openfreemap.org/styles/positron";
