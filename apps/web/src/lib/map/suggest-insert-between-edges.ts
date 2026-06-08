import { haversineDistanceMeters } from "@/lib/map/geo";
import { resolveMapPointLinkRef } from "@/lib/map/map-point-link-ref";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import type { MapPointRecord } from "@/types/map/map-points";

export type InsertBetweenEdgeCandidate = {
  fromMarkerId: number;
  toMarkerId: number;
  fromRef: string;
  toRef: string;
  distanceToSegmentMeters: number;
  segmentLengthMeters: number;
  projectionT: number;
};

const DEFAULT_LIMIT = 5;
const DEFAULT_MAX_DISTANCE_METERS = 80;
const MIN_PROJECTION_T = 0.04;
const MAX_PROJECTION_T = 0.96;

function projectPointOntoSegment(
  pointLat: number,
  pointLng: number,
  segStartLat: number,
  segStartLng: number,
  segEndLat: number,
  segEndLng: number,
): { latitude: number; longitude: number; t: number } {
  const deltaLat = segEndLat - segStartLat;
  const deltaLng = segEndLng - segStartLng;
  const lengthSquared = deltaLat * deltaLat + deltaLng * deltaLng;

  if (lengthSquared < 1e-18) {
    return { latitude: segStartLat, longitude: segStartLng, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointLat - segStartLat) * deltaLat + (pointLng - segStartLng) * deltaLng) / lengthSquared,
    ),
  );

  return {
    latitude: segStartLat + t * deltaLat,
    longitude: segStartLng + t * deltaLng,
    t,
  };
}

function edgeKey(leftId: number, rightId: number): string {
  return leftId < rightId ? `${leftId}:${rightId}` : `${rightId}:${leftId}`;
}

function scoreNeighborEdge(input: {
  latitude: number;
  longitude: number;
  fromPoint: MapPointRecord;
  toPoint: MapPointRecord;
  maxDistanceMeters: number;
}): InsertBetweenEdgeCandidate | null {
  const projected = projectPointOntoSegment(
    input.latitude,
    input.longitude,
    input.fromPoint.latitude,
    input.fromPoint.longitude,
    input.toPoint.latitude,
    input.toPoint.longitude,
  );

  if (projected.t < MIN_PROJECTION_T || projected.t > MAX_PROJECTION_T) {
    return null;
  }

  const distanceToSegmentMeters = haversineDistanceMeters(
    input.latitude,
    input.longitude,
    projected.latitude,
    projected.longitude,
  );

  if (distanceToSegmentMeters > input.maxDistanceMeters) {
    return null;
  }

  const segmentLengthMeters = haversineDistanceMeters(
    input.fromPoint.latitude,
    input.fromPoint.longitude,
    input.toPoint.latitude,
    input.toPoint.longitude,
  );

  if (segmentLengthMeters < 8) {
    return null;
  }

  const fromRef = resolveMapPointLinkRef(input.fromPoint);
  const toRef = resolveMapPointLinkRef(input.toPoint);
  const ordered =
    projected.t <= 0.5
      ? { from: input.fromPoint, to: input.toPoint, fromRef, toRef }
      : { from: input.toPoint, to: input.fromPoint, fromRef: toRef, toRef: fromRef };

  return {
    fromMarkerId: ordered.from.id,
    toMarkerId: ordered.to.id,
    fromRef: ordered.fromRef,
    toRef: ordered.toRef,
    distanceToSegmentMeters,
    segmentLengthMeters,
    projectionT: projected.t,
  };
}

export function suggestInsertBetweenEdges(input: {
  latitude: number;
  longitude: number;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  limit?: number;
  maxDistanceMeters?: number;
}): InsertBetweenEdgeCandidate[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const maxDistanceMeters = input.maxDistanceMeters ?? DEFAULT_MAX_DISTANCE_METERS;
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));
  const seenEdges = new Set<string>();
  const candidates: InsertBetweenEdgeCandidate[] = [];

  for (const neighbor of input.markerNeighbors) {
    const edgeId = edgeKey(neighbor.fromMarkerId, neighbor.toMarkerId);
    if (seenEdges.has(edgeId)) {
      continue;
    }
    seenEdges.add(edgeId);

    const fromPoint = pointsById.get(neighbor.fromMarkerId);
    const toPoint = pointsById.get(neighbor.toMarkerId);
    if (!fromPoint || !toPoint) {
      continue;
    }

    const scored = scoreNeighborEdge({
      latitude: input.latitude,
      longitude: input.longitude,
      fromPoint,
      toPoint,
      maxDistanceMeters,
    });
    if (scored) {
      candidates.push(scored);
    }
  }

  return candidates
    .sort((left, right) => left.distanceToSegmentMeters - right.distanceToSegmentMeters)
    .slice(0, limit);
}
