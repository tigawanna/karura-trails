import { OSM_RASTER_STYLE_JSON } from "@/lib/map-libre/osm-raster-style";
import type { BoundingBox } from "./trail";

export type MapBasemapPreset = "minimal" | "standard";

export type MapColorScheme = "light" | "dark";

export type MapStyleSpec = string;

export function normalizeMapColorScheme(colorScheme: string | null | undefined): MapColorScheme {
  return colorScheme === "dark" ? "dark" : "light";
}

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

export const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

export function openFreeMapStyleForScheme(colorScheme: MapColorScheme): string {
  return colorScheme === "dark" ? OPENFREEMAP_DARK_STYLE : OPENFREEMAP_POSITRON_STYLE;
}

export function resolveMapStyle(
  preset: MapBasemapPreset,
  colorScheme: MapColorScheme,
): MapStyleSpec {
  if (preset === "standard") {
    return OSM_RASTER_STYLE_JSON;
  }
  return openFreeMapStyleForScheme(colorScheme);
}
