import { KARURA_MAP_VIEWPORT } from "@/lib/map/karura-map-defaults";
import type { MapBaseMapStyle, MapViewport } from "@/types/map/maps";

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MapHandle = {
  panToQuery: (query: string) => Promise<{ error?: string }>;
  setViewport: (viewport: MapViewport) => void;
  fitBounds: (bounds: MapBounds, padding?: number) => MapViewport;
  getViewport: () => MapViewport;
};

export const LEAFLET_MAP_MAX_ZOOM = 22;

export const DEFAULT_MAP_VIEWPORT: MapViewport = KARURA_MAP_VIEWPORT;

export const MAP_FIT_BOUNDS_MAX_ZOOM = 21;
export const MAP_POINT_FOCUS_ZOOM = 19;
export const MAP_MIN_DETAIL_ZOOM = 16;

type BaseMapConfigEntry = {
  url: string;
  attribution: string;
  maxZoom: number;
};

export const BASE_MAP_CONFIG: Record<MapBaseMapStyle, BaseMapConfigEntry> = {
  outline: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 20,
  },
  standard: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
};

export async function geocodePlace(query: string) {
  const params = new URLSearchParams({ format: "json", q: query, limit: "1" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Location search failed. Try again.");
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
  }>;

  if (results.length === 0) {
    throw new Error("No matching location found.");
  }

  const first = results[0];
  if (!first) {
    throw new Error("No matching location found.");
  }

  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
  };
}

export function createBaseLayer(L: typeof import("leaflet"), style: MapBaseMapStyle) {
  const config = BASE_MAP_CONFIG[style];
  return L.tileLayer(config.url, {
    maxZoom: LEAFLET_MAP_MAX_ZOOM,
    maxNativeZoom: config.maxZoom,
    attribution: config.attribution,
    crossOrigin: "anonymous",
  });
}

export function createMapHandle(
  map: import("leaflet").Map,
  options: {
    setSuppressViewportSync: (value: boolean) => void;
    emitViewportChange: () => void;
  },
): MapHandle {
  return {
    async panToQuery(query) {
      try {
        const result = await geocodePlace(query);
        options.setSuppressViewportSync(true);
        map.setView([result.lat, result.lng], Math.max(map.getZoom(), MAP_MIN_DETAIL_ZOOM));
        options.emitViewportChange();
        options.setSuppressViewportSync(false);
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Location search failed." };
      }
    },
    setViewport(viewport) {
      options.setSuppressViewportSync(true);
      map.setView([viewport.latitude, viewport.longitude], viewport.zoom);
      options.emitViewportChange();
      options.setSuppressViewportSync(false);
    },
    fitBounds(bounds, padding = 48) {
      options.setSuppressViewportSync(true);
      map.fitBounds(
        [
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        ],
        { padding: [padding, padding], maxZoom: MAP_FIT_BOUNDS_MAX_ZOOM, animate: false },
      );
      options.emitViewportChange();
      options.setSuppressViewportSync(false);
      const center = map.getCenter();
      return { latitude: center.lat, longitude: center.lng, zoom: map.getZoom() };
    },
    getViewport() {
      const center = map.getCenter();
      return { latitude: center.lat, longitude: center.lng, zoom: map.getZoom() };
    },
  };
}
