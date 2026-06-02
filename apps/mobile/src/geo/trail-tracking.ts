import type { TrailWithGeometry } from "@/data-access-layer/trails";
import { geomParse, isValidLineString } from "@/geo/geom-parse";

export interface TrailVertex {
  lng: number;
  lat: number;
  elevation: number | null;
}

export type ElevationTrendDirection = "up" | "down" | "flat";

export interface ElevationTrend {
  direction: ElevationTrendDirection;
  changeMeters: number;
  summary: string;
  detail: string;
}

export type ElevationWindowPointRole = "past" | "current" | "ahead";

export interface ElevationWindowPoint {
  role: ElevationWindowPointRole;
  vertexIndex: number;
  elevation: number;
  distanceFromStartMeters: number;
  offsetFromCurrentMeters: number;
}

export interface ElevationWindow {
  points: ElevationWindowPoint[];
  minElevation: number;
  maxElevation: number;
}

export interface TrailOnTrackMatch {
  trail: TrailWithGeometry;
  distanceToTrailMeters: number;
  vertexIndex: number;
  vertexCount: number;
  closestVertexLabel: string;
  elevationTrend: ElevationTrend | null;
  elevationWindow: ElevationWindow | null;
  guidanceHint: string | null;
}

const EARTH_RADIUS_METERS = 6_371_000;
const ON_TRAIL_THRESHOLD_METERS = 80;
const FLAT_GRADE_METERS = 4;

export function parseTrailVertices(geomString: string | undefined): TrailVertex[] {
  const geom = geomParse(geomString);
  if (!isValidLineString(geom)) {
    return [];
  }

  const coordinates = geom.coordinates as number[][];
  return coordinates.map((coord) => {
    const lng = coord[0] ?? 0;
    const lat = coord[1] ?? 0;
    const elevation = coord.length > 2 && typeof coord[2] === "number" ? coord[2] : null;
    return { lng, lat, elevation };
  });
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projectOnSegment(
  lng: number,
  lat: number,
  start: TrailVertex,
  end: TrailVertex,
): { lng: number; lat: number; t: number } {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return { lng: start.lng, lat: start.lat, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(1, ((lng - start.lng) * dx + (lat - start.lat) * dy) / lengthSquared),
  );

  return {
    lng: start.lng + t * dx,
    lat: start.lat + t * dy,
    t,
  };
}

interface NearestOnTrailResult {
  distanceMeters: number;
  vertexIndex: number;
}

export function nearestPointOnTrail(
  lng: number,
  lat: number,
  vertices: TrailVertex[],
): NearestOnTrailResult | null {
  if (vertices.length === 0) {
    return null;
  }

  if (vertices.length === 1) {
    return {
      distanceMeters: haversineDistanceMeters(lng, lat, vertices[0].lng, vertices[0].lat),
      vertexIndex: 0,
    };
  }

  let bestDistance = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < vertices.length - 1; i++) {
    const start = vertices[i];
    const end = vertices[i + 1];
    const projected = projectOnSegment(lng, lat, start, end);
    const distanceMeters = haversineDistanceMeters(lng, lat, projected.lng, projected.lat);

    if (distanceMeters < bestDistance) {
      bestDistance = distanceMeters;
      bestIndex = projected.t >= 0.5 ? i + 1 : i;
    }
  }

  return {
    distanceMeters: bestDistance,
    vertexIndex: bestIndex,
  };
}

function cumulativeDistancesMeters(vertices: TrailVertex[]): number[] {
  const distances = [0];

  for (let i = 1; i < vertices.length; i++) {
    const prev = vertices[i - 1];
    const next = vertices[i];
    const segment = haversineDistanceMeters(prev.lng, prev.lat, next.lng, next.lat);
    distances.push(distances[i - 1] + segment);
  }

  return distances;
}

export function buildElevationWindow(
  vertices: TrailVertex[],
  vertexIndex: number,
  windowSize = 5,
): ElevationWindow | null {
  if (vertices.length === 0 || vertices[vertexIndex]?.elevation == null) {
    return null;
  }

  const distances = cumulativeDistancesMeters(vertices);
  const currentDistance = distances[vertexIndex] ?? 0;
  const startIndex = Math.max(0, vertexIndex - windowSize);
  const endIndex = Math.min(vertices.length - 1, vertexIndex + windowSize);
  const points: ElevationWindowPoint[] = [];

  for (let i = startIndex; i <= endIndex; i++) {
    const elevation = vertices[i]?.elevation;
    if (elevation == null) {
      continue;
    }

    const distanceFromStartMeters = distances[i] ?? currentDistance;
    let role: ElevationWindowPointRole = "current";
    if (i < vertexIndex) {
      role = "past";
    } else if (i > vertexIndex) {
      role = "ahead";
    }

    points.push({
      role,
      vertexIndex: i,
      elevation,
      distanceFromStartMeters,
      offsetFromCurrentMeters: distanceFromStartMeters - currentDistance,
    });
  }

  if (points.length < 2) {
    return null;
  }

  const elevations = points.map((point) => point.elevation);

  return {
    points,
    minElevation: Math.min(...elevations),
    maxElevation: Math.max(...elevations),
  };
}

export function estimateElevationTrend(
  vertices: TrailVertex[],
  vertexIndex: number,
  windowSize = 5,
): ElevationTrend | null {
  const current = vertices[vertexIndex]?.elevation;
  if (current == null) {
    return null;
  }

  const pastElevations: number[] = [];
  for (let i = Math.max(0, vertexIndex - windowSize); i < vertexIndex; i++) {
    const elevation = vertices[i]?.elevation;
    if (elevation != null) {
      pastElevations.push(elevation);
    }
  }

  const futureElevations: number[] = [];
  for (let i = vertexIndex + 1; i <= Math.min(vertices.length - 1, vertexIndex + windowSize); i++) {
    const elevation = vertices[i]?.elevation;
    if (elevation != null) {
      futureElevations.push(elevation);
    }
  }

  if (futureElevations.length === 0 && pastElevations.length === 0) {
    return null;
  }

  const futureAvg =
    futureElevations.length > 0
      ? futureElevations.reduce((sum, value) => sum + value, 0) / futureElevations.length
      : current;
  const pastAvg =
    pastElevations.length > 0
      ? pastElevations.reduce((sum, value) => sum + value, 0) / pastElevations.length
      : current;

  const changeMeters = Math.round(futureAvg - pastAvg);
  const absChange = Math.abs(changeMeters);

  if (absChange < FLAT_GRADE_METERS) {
    return {
      direction: "flat",
      changeMeters,
      summary: "Mostly flat",
      detail: `~${Math.round(current)} m elevation`,
    };
  }

  if (changeMeters > 0) {
    return {
      direction: "up",
      changeMeters,
      summary: "Climbing",
      detail: `+${absChange} m over the next section`,
    };
  }

  return {
    direction: "down",
    changeMeters,
    summary: "Descending",
    detail: `−${absChange} m over the next section`,
  };
}

export function findTrailOnTrack(
  lng: number,
  lat: number,
  trails: TrailWithGeometry[],
): TrailOnTrackMatch | null {
  let bestMatch: TrailOnTrackMatch | null = null;

  for (const trail of trails) {
    const vertices = parseTrailVertices(trail.geom);
    if (vertices.length === 0) {
      continue;
    }

    const nearest = nearestPointOnTrail(lng, lat, vertices);
    if (!nearest) {
      continue;
    }

    if (bestMatch && nearest.distanceMeters >= bestMatch.distanceToTrailMeters) {
      continue;
    }

    const vertexCount = vertices.length;
    const vertexIndex = nearest.vertexIndex;
    const onTrail = nearest.distanceMeters <= ON_TRAIL_THRESHOLD_METERS;

    bestMatch = {
      trail,
      distanceToTrailMeters: Math.round(nearest.distanceMeters),
      vertexIndex,
      vertexCount,
      closestVertexLabel: `Point ${vertexIndex + 1} of ${vertexCount}`,
      elevationTrend: onTrail ? estimateElevationTrend(vertices, vertexIndex) : null,
      elevationWindow: onTrail ? buildElevationWindow(vertices, vertexIndex) : null,
      guidanceHint: onTrail ? null : `Head toward ${trail.name}`,
    };
  }

  return bestMatch;
}

export function formatDistanceToTrail(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m from trail`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km from trail`;
}
