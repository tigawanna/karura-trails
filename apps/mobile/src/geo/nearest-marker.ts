import type { PointWithGeometry } from "@/data-access-layer/points";
import { geomParse, isValidPoint } from "@/geo/geom-parse";
import { KARURA_FOREST_BBOX } from "@/geo/karura-bounds";

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointCoordinates(
  point: PointWithGeometry,
): { latitude: number; longitude: number } | null {
  const geometry = geomParse(point.geom);
  if (!isValidPoint(geometry)) {
    return null;
  }

  const coords = geometry.coordinates;
  const longitude = typeof coords[0] === "number" ? coords[0] : null;
  const latitude = typeof coords[1] === "number" ? coords[1] : null;
  if (longitude === null || latitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export function findNearestMarker<T extends PointWithGeometry>(
  markers: T[],
  latitude: number,
  longitude: number,
  maxDistanceMeters = Number.POSITIVE_INFINITY,
): { marker: T; distanceMeters: number } | null {
  let nearest: T | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const marker of markers) {
    const coordinates = pointCoordinates(marker);
    if (!coordinates) {
      continue;
    }

    const distance = haversineDistanceMeters(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude,
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = marker;
    }
  }

  if (!nearest || nearestDistance > maxDistanceMeters) {
    return null;
  }

  return { marker: nearest, distanceMeters: nearestDistance };
}

const KARURA_PROXIMITY_BUFFER_METERS = 2500;

export function isNearKarura(latitude: number, longitude: number): boolean {
  const centerLat = (KARURA_FOREST_BBOX.minLat + KARURA_FOREST_BBOX.maxLat) / 2;
  const centerLng = (KARURA_FOREST_BBOX.minLng + KARURA_FOREST_BBOX.maxLng) / 2;
  return (
    haversineDistanceMeters(latitude, longitude, centerLat, centerLng) <=
    KARURA_PROXIMITY_BUFFER_METERS
  );
}

export function markerLabel(marker: PointWithGeometry): string {
  return marker.ref?.trim() || marker.name?.trim() || `#${marker.id}`;
}
