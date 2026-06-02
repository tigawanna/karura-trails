import type { TrailFeatureCollection } from "@/geo/geojson";

import rawTrails from "../../assets/data/trails.geojson";

function isFeatureCollection(value: unknown): value is TrailFeatureCollection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as TrailFeatureCollection;
  return candidate.type === "FeatureCollection" && Array.isArray(candidate.features);
}

export function loadTrailsGeoJSON(): TrailFeatureCollection {
  try {
    let data: unknown = rawTrails;

    if (typeof data === "string") {
      data = JSON.parse(data) as unknown;
    }

    if (data && typeof data === "object" && "default" in data) {
      data = (data as { default: unknown }).default;
    }

    if (!isFeatureCollection(data)) {
      throw new Error(
        "trails.geojson did not load as a FeatureCollection. Rebuild the app (Metro cache: expo start -c).",
      );
    }

    return data;
  } catch (error: unknown) {
    console.error("[loadTrailsGeoJSON] Failed to load trails.geojson:", error);
    throw error;
  }
}
