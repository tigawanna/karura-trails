import {
  findRouteThroughWaypoints,
  type GraphEdge,
  type GraphPoint,
} from "@/geo/graph/neighbor-graph";
import { findNearestMarker } from "@/geo/nearest-marker";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import type { NavigationStoreState } from "@/stores/navigation-store";

export function resolveNavigationStartPointId(input: {
  enrichedPoints: EnrichedRoutingPoint[];
  explicitFromPointId: number | null;
  userLatitude: number | null;
  userLongitude: number | null;
}): number | null {
  if (input.explicitFromPointId != null) {
    return input.explicitFromPointId;
  }

  if (input.userLatitude != null && input.userLongitude != null) {
    const nearest = findNearestMarker(
      input.enrichedPoints,
      input.userLatitude,
      input.userLongitude,
    );
    return nearest?.marker.id ?? null;
  }

  return null;
}

export function buildNavigationWaypoints(state: NavigationStoreState): number[] {
  if (state.fromPointId == null || state.toPointId == null) {
    return [];
  }

  return [state.fromPointId, ...state.viaPointIds, state.toPointId];
}

export function computeNavigationRoute(input: {
  state: NavigationStoreState;
  graphPoints: GraphPoint[];
  graphEdges: GraphEdge[];
}) {
  const waypointIds = buildNavigationWaypoints(input.state);
  if (waypointIds.length < 2) {
    return { pointIds: waypointIds, distanceMeters: 0, found: waypointIds.length > 0 };
  }

  return findRouteThroughWaypoints(
    waypointIds,
    input.graphPoints,
    input.graphEdges,
    input.state.blockedPointIds,
  );
}
