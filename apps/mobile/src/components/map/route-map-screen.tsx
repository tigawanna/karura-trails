import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { KaruraMap } from "@/components/map/karura-map";
import { MapLocationControls } from "@/components/map/map-location-controls";
import {
  MarkerDetailSheet,
  markerDistanceFromLocation,
} from "@/components/map/marker-detail-sheet";
import { NavigationBottomSheet } from "@/components/map/navigation-bottom-sheet";
import { LoadingState } from "@/components/ui/loading-state";
import { isNearKarura, markerLabel } from "@/geo/nearest-marker";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useNavigationController } from "@/hooks/use-navigation-controller";
import { resolveMarkerByRef } from "@/hooks/use-marker-search";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import { parseViaRefs } from "@/lib/navigation/route-params";
import { useNavigationStore } from "@/stores/navigation-store";
import { buildMarkerNavigationActions, showMarkerActionMenu } from "@/lib/ui/marker-action-menu";

export function RouteMapScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string; via?: string }>();
  const { location: staticLocation, errorMsg, isRefreshing, refreshLocation } = useDeviceLocation();
  const { enrichedPoints, pointsById, pointsByRef, isLoading } = useRoutingGraphData();

  const [detailMarkerId, setDetailMarkerId] = useState<number | null>(null);
  const [highlightedRoutePointId, setHighlightedRoutePointId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);

  const applyRouteResult = useNavigationStore((state) => state.applyRouteResult);

  const activeLocation = useLiveLocation(true);
  const userLatitude = activeLocation?.coords.latitude ?? staticLocation?.coords.latitude ?? null;
  const userLongitude =
    activeLocation?.coords.longitude ?? staticLocation?.coords.longitude ?? null;
  const heading = useDeviceHeading(Boolean(userLatitude && userLongitude));

  const beginNavigation = useNavigationStore((state) => state.beginNavigation);

  const navigation = useNavigationController({
    enrichedPoints,
    userLatitude,
    userLongitude,
  });

  useEffect(() => {
    if (hydrated || isLoading) {
      return;
    }

    const startPoint = resolveMarkerByRef(pointsByRef, params.from);
    const endPoint = resolveMarkerByRef(pointsByRef, params.to);
    if (!startPoint || !endPoint) {
      setHydrated(true);
      return;
    }

    const viaPointIds = parseViaRefs(params.via)
      .map((ref) => resolveMarkerByRef(pointsByRef, ref)?.id)
      .filter((value): value is number => value != null);

    beginNavigation({
      fromPointId: startPoint.id,
      toPointId: endPoint.id,
      viaPointIds,
    });
    setHydrated(true);
  }, [beginNavigation, hydrated, isLoading, params.from, params.to, params.via, pointsByRef]);

  const fromPoint = useMemo(
    () =>
      navigation.fromPointId != null ? (pointsById.get(navigation.fromPointId) ?? null) : null,
    [navigation.fromPointId, pointsById],
  );

  const toPoint = useMemo(
    () => (navigation.toPointId != null ? (pointsById.get(navigation.toPointId) ?? null) : null),
    [navigation.toPointId, pointsById],
  );

  const focusPointId = followUser
    ? (highlightedRoutePointId ?? detailMarkerId ?? navigation.toPointId ?? null)
    : (highlightedRoutePointId ??
      detailMarkerId ??
      navigation.toPointId ??
      navigation.fromPointId ??
      null);
  const detailMarker = detailMarkerId != null ? (pointsById.get(detailMarkerId) ?? null) : null;

  const mapLocation = useMemo(() => {
    if (userLatitude == null || userLongitude == null) {
      return null;
    }
    return { latitude: userLatitude, longitude: userLongitude };
  }, [userLatitude, userLongitude]);

  const nearKarura = useMemo(() => {
    if (userLatitude == null || userLongitude == null) {
      return false;
    }
    return isNearKarura(userLatitude, userLongitude);
  }, [userLatitude, userLongitude]);

  const distanceMeters = useMemo(() => {
    if (!detailMarker || !mapLocation) {
      return null;
    }
    return markerDistanceFromLocation(detailMarker, mapLocation.latitude, mapLocation.longitude);
  }, [detailMarker, mapLocation]);

  const handleUserInteraction = useCallback(() => {
    setFollowUser(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setFollowUser(true);
    setRecenterKey((current) => current + 1);
    setDetailMarkerId(null);
    setHighlightedRoutePointId(null);
  }, []);

  const handleRefreshLocation = useCallback(() => {
    refreshLocation();
    setFollowUser(true);
    setRecenterKey((current) => current + 1);
  }, [refreshLocation]);

  const handleMarkerPress = useCallback((pointId: number) => {
    setFollowUser(false);
    setDetailMarkerId(pointId);
  }, []);

  const handleMarkerLongPress = useCallback(
    (pointId: number) => {
      const marker = pointsById.get(pointId);
      if (!marker) {
        return;
      }

      const actions = buildMarkerNavigationActions({
        markerId: pointId,
        isNavigating: navigation.isNavigating,
        isOrigin: navigation.isOrigin(pointId),
        isDestination: navigation.isDestination(pointId),
        isOnActiveRoute: navigation.isOnActiveRoute(pointId),
        isViaPoint: navigation.isViaPoint(pointId),
        isBlockedPoint: navigation.isBlockedPoint(pointId),
        onNavigateTo: () => navigation.startNavigationTo(pointId),
        onNavigateHereInstead: () => {
          navigation.navigateToInstead(pointId);
          setDetailMarkerId(pointId);
        },
        onRouteThroughHere: () => {
          navigation.routeThroughHere(pointId);
          setDetailMarkerId(pointId);
        },
        onRemoveFromRoute: () => navigation.removeFromRoute(pointId),
        onRemoveViaStop: () => navigation.removeViaPoint(pointId),
        onUnblockPoint: () => navigation.unblockPoint(pointId),
        onViewDetails: () => setDetailMarkerId(pointId),
      });

      showMarkerActionMenu({
        markerLabel: markerLabel(marker),
        actions,
      });
    },
    [navigation, pointsById],
  );

  if (isLoading || !hydrated) {
    return <LoadingState message="Loading route…" testID="route-map-loading" />;
  }

  if (!navigation.isNavigating && navigation.toPointId == null) {
    return <LoadingState message="Route markers not found." testID="route-map-missing" />;
  }

  return (
    <View style={styles.container} testID="route-map-screen">
      <KaruraMap
        focusPointId={focusPointId}
        routePointIds={navigation.routePointIds}
        userLocation={mapLocation}
        userHeading={heading}
        followUserLocation={followUser}
        recenterKey={recenterKey}
        enableMarkerCapture={false}
        onMarkerPress={handleMarkerPress}
        onMarkerLongPress={handleMarkerLongPress}
        onUserInteraction={handleUserInteraction}
      />
      <MapLocationControls
        followUser={followUser}
        isRefreshing={isRefreshing}
        onRecenter={handleRecenter}
        onRefresh={handleRefreshLocation}
      />
      {navigation.toPointId != null ? (
        <NavigationBottomSheet
          fromPoint={fromPoint}
          toPoint={toPoint}
          viaPointIds={navigation.viaPointIds}
          routePointIds={navigation.routePointIds}
          distanceMeters={navigation.distanceMeters}
          isComputing={!navigation.isNavigating}
          highlightedPointId={highlightedRoutePointId}
          userLatitude={userLatitude}
          userLongitude={userLongitude}
          onHighlightPoint={(pointId) => {
            setFollowUser(false);
            setHighlightedRoutePointId(pointId);
          }}
          onAddVia={navigation.routeThroughHere}
          onRemoveVia={navigation.removeViaPoint}
          onSelectRoute={(pointIds, distance) =>
            applyRouteResult({ pointIds, distanceMeters: distance })
          }
          onClearRoute={navigation.clearNavigation}
        />
      ) : null}
      {detailMarker ? (
        <MarkerDetailSheet
          marker={detailMarker}
          distanceMeters={distanceMeters}
          isLoading={false}
          locationError={errorMsg}
          nearKarura={nearKarura}
          lastKnownLatitude={userLatitude}
          lastKnownLongitude={userLongitude}
          routeIncludesMarker={navigation.isOnActiveRoute(detailMarker.id)}
          routeSummary={navigation.routeSummary}
          initialSnapIndex={1}
          dismissible
          overlay
          onDismiss={() => setDetailMarkerId(null)}
          onClearRoute={navigation.clearNavigation}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
