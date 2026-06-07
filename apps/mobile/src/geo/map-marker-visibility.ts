import type { EnrichedRoutingPoint } from "@/geo/point-record";

export const MAP_ALWAYS_VISIBLE_LANDMARK_SLUGS = ["toilet", "bench", "water", "waterfall"] as const;

const alwaysVisibleLandmarkSlugSet = new Set<string>(MAP_ALWAYS_VISIBLE_LANDMARK_SLUGS);

export function isAlwaysVisibleLandmark(point: EnrichedRoutingPoint): boolean {
  return point.featureSlugs.some((slug) => alwaysVisibleLandmarkSlugSet.has(slug));
}

export function isMapVisibleRoutingPoint(
  point: EnrichedRoutingPoint,
  isNavigating: boolean,
): boolean {
  if (isNavigating) {
    return true;
  }

  if (point.markerKind === "physical") {
    return true;
  }

  if (point.markerKind === "virtual") {
    return false;
  }

  return isAlwaysVisibleLandmark(point);
}

export function filterMapVisibleRoutingPoints(
  points: EnrichedRoutingPoint[],
  isNavigating: boolean,
): EnrichedRoutingPoint[] {
  return points.filter((point) => isMapVisibleRoutingPoint(point, isNavigating));
}
