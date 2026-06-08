import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import type { MapPointRecord } from "@/types/map/map-points";

export function buildMarkerIdsWithNeighborLinks(neighbors: MarkerNeighborRecord[]): number[] {
  const ids = new Set<number>();
  for (const neighbor of neighbors) {
    ids.add(neighbor.fromMarkerId);
    ids.add(neighbor.toMarkerId);
  }
  return [...ids].sort((left, right) => left - right);
}

function getUndirectedNeighborIds(neighbors: MarkerNeighborRecord[], markerId: number): number[] {
  const ids = new Set<number>();
  for (const neighbor of neighbors) {
    if (neighbor.fromMarkerId === markerId) {
      ids.add(neighbor.toMarkerId);
    }
    if (neighbor.toMarkerId === markerId) {
      ids.add(neighbor.fromMarkerId);
    }
  }
  return [...ids];
}

function isNaturalGraphEndpoint(point: MapPointRecord): boolean {
  return point.category === "gate" || point.nodeRole === "endpoint";
}

function collectDegreeOneMarkerIds(
  mapPoints: MapPointRecord[],
  neighbors: MarkerNeighborRecord[],
  predicate: (point: MapPointRecord) => boolean,
): number[] {
  const ids: number[] = [];
  for (const point of mapPoints) {
    if (getUndirectedNeighborIds(neighbors, point.id).length !== 1) {
      continue;
    }
    if (predicate(point)) {
      ids.push(point.id);
    }
  }
  return ids.sort((left, right) => left - right);
}

export function buildDeadEndMarkerIds(
  mapPoints: MapPointRecord[],
  neighbors: MarkerNeighborRecord[],
): number[] {
  return collectDegreeOneMarkerIds(mapPoints, neighbors, (point) => !isNaturalGraphEndpoint(point));
}

export function buildNaturalEndpointMarkerIds(
  mapPoints: MapPointRecord[],
  neighbors: MarkerNeighborRecord[],
): number[] {
  return collectDegreeOneMarkerIds(mapPoints, neighbors, (point) => isNaturalGraphEndpoint(point));
}

export function markerHasNeighborLinks(
  markerId: number,
  markerIdsWithNeighborLinks: ReadonlySet<number>,
): boolean {
  return markerIdsWithNeighborLinks.has(markerId);
}

export function markerIsDeadEnd(markerId: number, deadEndMarkerIds: ReadonlySet<number>): boolean {
  return deadEndMarkerIds.has(markerId);
}

export function markerIsNaturalEndpoint(
  markerId: number,
  naturalEndpointMarkerIds: ReadonlySet<number>,
): boolean {
  return naturalEndpointMarkerIds.has(markerId);
}
