import { executeQuerySync } from "@/lib/drizzle/client";
import type { ElevationInference } from "@/types/trail";

interface NearestPathRow {
  id: number;
  name: string;
  distance_m: number;
  geom_json: string;
}

export function inferElevationAtPoint(
  lng: number,
  lat: number,
  searchRadiusMeters = 50,
): ElevationInference | null {
  const nearestPaths = executeQuerySync<NearestPathRow>(
    `SELECT id, name, distance_m, geom_json
     FROM (
       SELECT p.id, p.name,
              Distance(p.geom, MakePoint(${lng}, ${lat}, 4326), 0) AS distance_m,
              AsGeoJSON(p.geom) AS geom_json
       FROM paths p
     )
     WHERE distance_m <= ${searchRadiusMeters}
     ORDER BY distance_m
     LIMIT 1;`,
  );

  if (nearestPaths.length === 0) return null;

  const nearest = nearestPaths[0];
  const coordinates: [number, number, number][] = JSON.parse(nearest.geom_json).coordinates;

  const elevation = interpolateElevation(coordinates, lng, lat);

  return {
    elevation,
    source: "inferred_from_path",
    nearestPathId: nearest.id,
    nearestPathName: nearest.name,
    distanceToPath: nearest.distance_m,
    positionOnPath: findPositionOnPath(coordinates, lng, lat),
  };
}

function interpolateElevation(
  coordinates: [number, number, number][],
  lng: number,
  lat: number,
): number {
  let closestIdx = 0;
  let closestDist = Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const d = haversineDistance(lat, lng, coordinates[i][1], coordinates[i][0]);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }

  const neighborIdx =
    closestIdx > 0 && closestIdx < coordinates.length - 1
      ? distToCoord(lng, lat, coordinates[closestIdx - 1]) <
        distToCoord(lng, lat, coordinates[closestIdx + 1])
        ? closestIdx - 1
        : closestIdx + 1
      : closestIdx === 0
        ? 1
        : coordinates.length - 2;

  const a = coordinates[closestIdx];
  const b = coordinates[neighborIdx];

  const dA = haversineDistance(lat, lng, a[1], a[0]);
  const dB = haversineDistance(lat, lng, b[1], b[0]);
  const total = dA + dB;

  if (total === 0) return a[2];

  const t = dA / total;
  return a[2] * (1 - t) + b[2] * t;
}

function findPositionOnPath(
  coordinates: [number, number, number][],
  lng: number,
  lat: number,
): number {
  let totalDist = 0;
  const segDists: number[] = [];

  for (let i = 1; i < coordinates.length; i++) {
    const d = haversineDistance(
      coordinates[i - 1][1],
      coordinates[i - 1][0],
      coordinates[i][1],
      coordinates[i][0],
    );
    segDists.push(d);
    totalDist += d;
  }

  let closestSegIdx = 0;
  let closestDist = Infinity;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const midLat = (coordinates[i][1] + coordinates[i + 1][1]) / 2;
    const midLng = (coordinates[i][0] + coordinates[i + 1][0]) / 2;
    const d = haversineDistance(lat, lng, midLat, midLng);
    if (d < closestDist) {
      closestDist = d;
      closestSegIdx = i;
    }
  }

  let distToSegment = 0;
  for (let i = 0; i < closestSegIdx; i++) {
    distToSegment += segDists[i];
  }

  return totalDist > 0 ? distToSegment / totalDist : 0;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distToCoord(lng: number, lat: number, coord: [number, number, number]): number {
  return (lng - coord[0]) ** 2 + (lat - coord[1]) ** 2;
}
