import { useEffect, useMemo } from "react";
import { Alert } from "react-native";

import type { EnrichedRoutingPoint } from "@/geo/point-record";
import {
  computeNavigationRoute,
  resolveNavigationStartPointId,
} from "@/services/navigation/navigation-route.service";
import { useNavigationStore } from "@/stores/navigation-store";
import { formatRouteDistance } from "@/lib/navigation/route-params";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";

export function useNavigationController(input: {
  enrichedPoints: EnrichedRoutingPoint[];
  userLatitude: number | null;
  userLongitude: number | null;
}) {
  const { graphPoints, graphEdges, pointsById } = useRoutingGraphData();

  const fromPointId = useNavigationStore((state) => state.fromPointId);
  const toPointId = useNavigationStore((state) => state.toPointId);
  const viaPointIds = useNavigationStore((state) => state.viaPointIds);
  const blockedPointIds = useNavigationStore((state) => state.blockedPointIds);
  const routePointIds = useNavigationStore((state) => state.routePointIds);
  const distanceMeters = useNavigationStore((state) => state.distanceMeters);

  const clearNavigation = useNavigationStore((state) => state.clearNavigation);
  const beginNavigation = useNavigationStore((state) => state.beginNavigation);
  const setFromPointId = useNavigationStore((state) => state.setFromPointId);
  const navigateToInstead = useNavigationStore((state) => state.navigateToInstead);
  const routeThroughHere = useNavigationStore((state) => state.routeThroughHere);
  const removeFromRoute = useNavigationStore((state) => state.removeFromRoute);
  const removeViaPoint = useNavigationStore((state) => state.removeViaPoint);
  const unblockPoint = useNavigationStore((state) => state.unblockPoint);
  const applyRouteResult = useNavigationStore((state) => state.applyRouteResult);

  useEffect(() => {
    if (toPointId == null) {
      applyRouteResult({ pointIds: [], distanceMeters: 0 });
      return;
    }

    let resolvedFrom = fromPointId;
    if (resolvedFrom == null) {
      resolvedFrom = resolveNavigationStartPointId({
        enrichedPoints: input.enrichedPoints,
        explicitFromPointId: null,
        userLatitude: input.userLatitude,
        userLongitude: input.userLongitude,
      });
      if (resolvedFrom != null) {
        setFromPointId(resolvedFrom);
      }
    }

    if (resolvedFrom == null) {
      applyRouteResult({ pointIds: [], distanceMeters: 0 });
      return;
    }

    const route = computeNavigationRoute({
      state: {
        fromPointId: resolvedFrom,
        toPointId,
        viaPointIds,
        blockedPointIds,
        routePointIds: [],
        distanceMeters: 0,
      },
      graphPoints,
      graphEdges,
    });

    const nextPointIds = route.found ? route.pointIds : [];
    const nextDistance = route.found ? route.distanceMeters : 0;
    const current = useNavigationStore.getState();
    const samePath =
      current.routePointIds.length === nextPointIds.length &&
      current.routePointIds.every((id, index) => id === nextPointIds[index]);
    if (samePath && current.distanceMeters === nextDistance) {
      return;
    }

    applyRouteResult({
      pointIds: nextPointIds,
      distanceMeters: nextDistance,
    });
  }, [
    applyRouteResult,
    blockedPointIds,
    fromPointId,
    graphEdges,
    graphPoints,
    input.enrichedPoints.length,
    input.userLatitude,
    input.userLongitude,
    setFromPointId,
    toPointId,
    viaPointIds,
  ]);

  const isNavigating = routePointIds.length > 1;

  const routeSummary = useMemo(() => {
    if (!isNavigating) {
      return null;
    }
    return {
      distanceLabel: formatRouteDistance(distanceMeters),
      stopCount: routePointIds.length,
      viaCount: viaPointIds.length,
      blockedCount: blockedPointIds.length,
    };
  }, [
    blockedPointIds.length,
    distanceMeters,
    isNavigating,
    routePointIds.length,
    viaPointIds.length,
  ]);

  const startNavigationTo = (targetPointId: number) => {
    const target = pointsById.get(targetPointId);
    if (!target) {
      return false;
    }

    const startId = resolveNavigationStartPointId({
      enrichedPoints: input.enrichedPoints,
      explicitFromPointId: fromPointId,
      userLatitude: input.userLatitude,
      userLongitude: input.userLongitude,
    });

    if (startId == null) {
      Alert.alert("No start point", "Could not determine your nearest trail marker.");
      return false;
    }

    beginNavigation({
      fromPointId: startId,
      toPointId: targetPointId,
    });

    return true;
  };

  const routePointIdSet = useMemo(() => new Set(routePointIds), [routePointIds]);

  const isOnActiveRoute = (pointId: number) => routePointIdSet.has(pointId);
  const isViaPoint = (pointId: number) => viaPointIds.includes(pointId);
  const isBlockedPoint = (pointId: number) => blockedPointIds.includes(pointId);
  const isDestination = (pointId: number) => toPointId === pointId;
  const isOrigin = (pointId: number) => fromPointId === pointId;

  return {
    fromPointId,
    toPointId,
    viaPointIds,
    blockedPointIds,
    routePointIds,
    distanceMeters,
    isNavigating,
    routeSummary,
    routePointIdSet,
    clearNavigation,
    startNavigationTo,
    navigateToInstead,
    routeThroughHere,
    removeFromRoute,
    removeViaPoint,
    unblockPoint,
    isOnActiveRoute,
    isViaPoint,
    isBlockedPoint,
    isDestination,
    isOrigin,
  };
}
