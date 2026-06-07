import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { pointCoordinates } from "@/geo/nearest-marker";

export type ElevationAheadSummary = {
  currentElevation: number;
  endElevation: number;
  netChangeMeters: number;
  totalAscentMeters: number;
  totalDescentMeters: number;
};

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getRouteProgressIndex(
  routePointIds: number[],
  pointsById: Map<number, EnrichedRoutingPoint>,
  userLatitude: number | null,
  userLongitude: number | null,
): number {
  if (routePointIds.length === 0) {
    return 0;
  }

  if (userLatitude == null || userLongitude == null) {
    return 0;
  }

  let startIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < routePointIds.length; index += 1) {
    const point = pointsById.get(routePointIds[index]);
    const coordinates = point ? pointCoordinates(point) : null;
    if (!coordinates) {
      continue;
    }
    const distance = haversineDistanceMeters(
      userLatitude,
      userLongitude,
      coordinates.latitude,
      coordinates.longitude,
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      startIndex = index;
    }
  }

  return startIndex;
}

export function getUpcomingRouteMarkers(
  routePointIds: number[],
  pointsById: Map<number, EnrichedRoutingPoint>,
  userLatitude: number | null,
  userLongitude: number | null,
  limit = 10,
): EnrichedRoutingPoint[] {
  if (routePointIds.length === 0) {
    return [];
  }

  const startIndex = getRouteProgressIndex(routePointIds, pointsById, userLatitude, userLongitude);

  return routePointIds
    .slice(startIndex, startIndex + limit)
    .map((id) => pointsById.get(id))
    .filter((point): point is EnrichedRoutingPoint => point != null);
}

function resolveElevation(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

export function computeElevationAheadSummary(
  routePointIds: number[],
  pointsById: Map<number, EnrichedRoutingPoint>,
  userLatitude: number | null,
  userLongitude: number | null,
  userAltitude: number | null,
  previewLimit = 10,
): ElevationAheadSummary | null {
  const upcoming = getUpcomingRouteMarkers(
    routePointIds,
    pointsById,
    userLatitude,
    userLongitude,
    previewLimit,
  );

  const withElevation = upcoming.filter((marker) => marker.elevation != null);
  if (withElevation.length < 2) {
    return null;
  }

  const progressIndex = getRouteProgressIndex(
    routePointIds,
    pointsById,
    userLatitude,
    userLongitude,
  );
  const progressMarker = pointsById.get(routePointIds[progressIndex] ?? -1);
  const gpsElevation = resolveElevation(userAltitude);
  const markerElevation = resolveElevation(progressMarker?.elevation ?? null);
  const currentElevation = gpsElevation ?? markerElevation ?? withElevation[0].elevation;
  if (currentElevation == null) {
    return null;
  }

  const endElevation = withElevation[withElevation.length - 1].elevation as number;

  let totalAscentMeters = 0;
  let totalDescentMeters = 0;
  let previous = currentElevation;
  for (const marker of withElevation) {
    const next = marker.elevation as number;
    const delta = next - previous;
    if (delta > 0) {
      totalAscentMeters += delta;
    } else if (delta < 0) {
      totalDescentMeters += Math.abs(delta);
    }
    previous = next;
  }

  return {
    currentElevation,
    endElevation,
    netChangeMeters: endElevation - currentElevation,
    totalAscentMeters,
    totalDescentMeters,
  };
}

export function formatElevationAheadSummary(summary: ElevationAheadSummary): string {
  const { netChangeMeters, totalAscentMeters, totalDescentMeters } = summary;
  const absNet = Math.abs(netChangeMeters);

  let headline: string;
  if (absNet < 3) {
    headline = "Mostly flat ahead";
  } else if (netChangeMeters > 0) {
    headline = `Ascend ${Math.round(absNet)} m ahead`;
  } else {
    headline = `Descend ${Math.round(absNet)} m ahead`;
  }

  const climbParts: string[] = [];
  if (totalAscentMeters >= 3) {
    climbParts.push(`↑ ${Math.round(totalAscentMeters)} m`);
  }
  if (totalDescentMeters >= 3) {
    climbParts.push(`↓ ${Math.round(totalDescentMeters)} m`);
  }

  if (climbParts.length === 0) {
    return headline;
  }

  return `${headline} · ${climbParts.join(" · ")}`;
}
