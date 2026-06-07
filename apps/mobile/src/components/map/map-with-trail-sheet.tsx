import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { capturedPointsQueryOptions } from "@/data-access-layer/points";
import { AddMarkerFab } from "@/components/map/add-marker-fab";
import { MapBackToRouteButton } from "@/components/map/map-back-to-route-button";
import { KaruraMap } from "@/components/map/karura-map";
import { MapLocationControls } from "@/components/map/map-location-controls";
import { MapMarkerSearch } from "@/components/map/map-marker-search";
import {
  MarkerDetailSheet,
  markerDistanceFromLocation,
} from "@/components/map/marker-detail-sheet";
import { NavigationBottomSheet } from "@/components/map/navigation-bottom-sheet";
import { MapDrawerButton } from "@/components/map/map-drawer-button";
import { MarkerCaptureSheet } from "@/components/markers/marker-capture-sheet";
import { TrailOnTrackSheet } from "@/components/trails/trail-on-track-sheet";
import { markerLabel, pointCoordinates, isNearKarura } from "@/geo/nearest-marker";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { useUserLocationHeading } from "@/hooks/use-user-location-heading";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useLiveLocation } from "@/hooks/use-live-location";
import type { MarkerCaptureDraft } from "@/hooks/use-marker-capture";
import { useNavigationController } from "@/hooks/use-navigation-controller";
import { useTrailOnTrack } from "@/hooks/use-trail-on-track";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import {
  buildMarkerNavigationActions,
  confirmStartNavigationTo,
  showMarkerActionMenu,
} from "@/lib/ui/marker-action-menu";
import { useNavigationStore } from "@/stores/navigation-store";

export function MapWithTrailSheet() {
  const {
    location: staticLocation,
    errorMsg,
    isRefreshing,
    refreshLocation,
    manuallySetLocation,
  } = useDeviceLocation();
  const { match, isLoading: trackLoading } = useTrailOnTrack();
  const { enrichedPoints, pointsById } = useRoutingGraphData();
  const { data: capturedPoints = [] } = useQuery(capturedPointsQueryOptions);

  const [overlayMarkerId, setOverlayMarkerId] = useState<number | null>(null);
  const [pinnedCameraPointId, setPinnedCameraPointId] = useState<number | null>(null);
  const [highlightedRoutePointId, setHighlightedRoutePointId] = useState<number | null>(null);
  const [captureVisible, setCaptureVisible] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<MarkerCaptureDraft | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [recenterKey, setRecenterKey] = useState(0);

  const applyRouteResult = useNavigationStore((state) => state.applyRouteResult);

  const activeLocation = useLiveLocation(true);
  const userLatitude = activeLocation?.coords.latitude ?? staticLocation?.coords.latitude ?? null;
  const userLongitude =
    activeLocation?.coords.longitude ?? staticLocation?.coords.longitude ?? null;

  const userAltitude = activeLocation?.coords.altitude ?? staticLocation?.coords.altitude ?? null;

  const navigation = useNavigationController({
    enrichedPoints,
    userLatitude,
    userLongitude,
  });

  const heading = useUserLocationHeading(
    activeLocation ?? staticLocation,
    Boolean(userLatitude && userLongitude),
  );

  const showNavigationSheet = navigation.toPointId != null;

  useEffect(() => {
    if (!showNavigationSheet) {
      setHighlightedRoutePointId(null);
    }
  }, [showNavigationSheet]);

  const overlayMarker = useMemo((): EnrichedRoutingPoint | null => {
    if (overlayMarkerId == null) {
      return null;
    }
    return pointsById.get(overlayMarkerId) ?? null;
  }, [overlayMarkerId, pointsById]);

  const fromPoint = useMemo(
    () =>
      navigation.fromPointId != null ? (pointsById.get(navigation.fromPointId) ?? null) : null,
    [navigation.fromPointId, pointsById],
  );

  const toPoint = useMemo(
    () => (navigation.toPointId != null ? (pointsById.get(navigation.toPointId) ?? null) : null),
    [navigation.toPointId, pointsById],
  );

  const mapFocusPointId = followUser
    ? (highlightedRoutePointId ??
      overlayMarkerId ??
      pinnedCameraPointId ??
      navigation.toPointId ??
      null)
    : (pinnedCameraPointId ??
      highlightedRoutePointId ??
      overlayMarkerId ??
      navigation.toPointId ??
      match?.marker.id ??
      null);

  const isViewingOffRoute = showNavigationSheet && pinnedCameraPointId != null && !followUser;

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

  const overlayDistanceMeters = useMemo(() => {
    if (!overlayMarker || !mapLocation) {
      return null;
    }
    return markerDistanceFromLocation(overlayMarker, mapLocation.latitude, mapLocation.longitude);
  }, [overlayMarker, mapLocation]);

  const draftCoordinate = useMemo(() => {
    if (!captureDraft) {
      return null;
    }
    return { lng: captureDraft.lng, lat: captureDraft.lat };
  }, [captureDraft]);

  const handleUserInteraction = useCallback(() => {
    setFollowUser(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setFollowUser(true);
    setRecenterKey((current) => current + 1);
    setOverlayMarkerId(null);
    setPinnedCameraPointId(null);
    setHighlightedRoutePointId(null);
  }, []);

  const handleBackToRoute = useCallback(() => {
    setFollowUser(false);
    setOverlayMarkerId(null);
    setPinnedCameraPointId(navigation.toPointId);
    setHighlightedRoutePointId(null);
  }, [navigation.toPointId]);

  const setLocationAtMarker = useCallback(
    (markerId: number) => {
      const marker = pointsById.get(markerId);
      const coordinates = marker ? pointCoordinates(marker) : null;
      if (!coordinates) {
        return;
      }
      manuallySetLocation(coordinates.latitude, coordinates.longitude);
    },
    [manuallySetLocation, pointsById],
  );

  const handleRefreshLocation = useCallback(() => {
    refreshLocation();
    setFollowUser(true);
    setRecenterKey((current) => current + 1);
  }, [refreshLocation]);

  const handleSearchSelectMarker = useCallback((marker: EnrichedRoutingPoint) => {
    setFollowUser(false);
    setPinnedCameraPointId(marker.id);
    setOverlayMarkerId(marker.id);
    setHighlightedRoutePointId(null);
  }, []);

  const openCapture = useCallback((draft: MarkerCaptureDraft) => {
    setCaptureDraft(draft);
    setCaptureVisible(true);
  }, []);

  const handleAddMarker = useCallback(() => {
    if (staticLocation) {
      openCapture({
        lng: staticLocation.coords.longitude,
        lat: staticLocation.coords.latitude,
        gpsAltitude: staticLocation.coords.altitude,
      });
      return;
    }

    openCapture({
      lng: 36.82,
      lat: -1.24,
      gpsAltitude: null,
    });
  }, [openCapture, staticLocation]);

  const handleMapLongPress = useCallback(
    (lng: number, lat: number) => {
      openCapture({
        lng,
        lat,
        gpsAltitude: staticLocation?.coords.altitude ?? null,
      });
    },
    [openCapture, staticLocation?.coords.altitude],
  );

  const startNavigationTo = useCallback(
    (markerId: number) => {
      const marker = pointsById.get(markerId);
      if (!marker) {
        return;
      }

      const started = navigation.startNavigationTo(markerId);
      if (!started) {
        return;
      }

      setOverlayMarkerId(null);
    },
    [navigation, pointsById],
  );

  const handleMarkerPress = useCallback((markerId: number) => {
    setFollowUser(false);
    setPinnedCameraPointId(markerId);
    setOverlayMarkerId(markerId);
  }, []);

  const handleMarkerLongPress = useCallback(
    (markerId: number) => {
      const marker = pointsById.get(markerId);
      if (!marker) {
        return;
      }

      const actions = buildMarkerNavigationActions({
        markerId,
        isNavigating: navigation.isNavigating,
        isOrigin: navigation.isOrigin(markerId),
        isDestination: navigation.isDestination(markerId),
        isOnActiveRoute: navigation.isOnActiveRoute(markerId),
        isViaPoint: navigation.isViaPoint(markerId),
        isBlockedPoint: navigation.isBlockedPoint(markerId),
        onNavigateTo: () =>
          confirmStartNavigationTo(markerLabel(marker), () => startNavigationTo(markerId)),
        onNavigateFrom: () => navigation.navigateFromHere(markerId),
        onSetLocationHere: () => setLocationAtMarker(markerId),
        onNavigateHereInstead: () => {
          navigation.navigateToInstead(markerId);
          setPinnedCameraPointId(markerId);
          setOverlayMarkerId(markerId);
        },
        onRouteThroughHere: () => {
          navigation.routeThroughHere(markerId);
          setPinnedCameraPointId(markerId);
          setOverlayMarkerId(markerId);
        },
        onRemoveFromRoute: () => navigation.removeFromRoute(markerId),
        onRemoveViaStop: () => navigation.removeViaPoint(markerId),
        onUnblockPoint: () => navigation.unblockPoint(markerId),
        onViewDetails: () => setOverlayMarkerId(markerId),
      });

      showMarkerActionMenu({
        markerLabel: markerLabel(marker),
        actions,
      });
    },
    [navigation, pointsById, setLocationAtMarker, startNavigationTo],
  );

  const handleUseGps = useCallback(() => {
    if (!staticLocation) {
      return;
    }
    setCaptureDraft({
      lng: staticLocation.coords.longitude,
      lat: staticLocation.coords.latitude,
      gpsAltitude: staticLocation.coords.altitude,
    });
  }, [staticLocation]);

  const handleSaved = useCallback(() => {
    setCaptureVisible(false);
    setCaptureDraft(null);
  }, []);

  return (
    <View style={styles.container} testID="map-with-trail-sheet">
      <KaruraMap
        capturedPoints={capturedPoints}
        draftCoordinate={captureVisible ? draftCoordinate : null}
        focusPointId={mapFocusPointId}
        routePointIds={navigation.routePointIds}
        isNavigating={showNavigationSheet}
        userLocation={mapLocation}
        userHeading={heading}
        followUserLocation={followUser}
        rotateMapToHeading={showNavigationSheet}
        recenterKey={recenterKey}
        onLongPress={handleMapLongPress}
        onMarkerPress={handleMarkerPress}
        onMarkerLongPress={handleMarkerLongPress}
        onUserInteraction={handleUserInteraction}
      />
      <MapDrawerButton />
      <MapMarkerSearch onSelectMarker={handleSearchSelectMarker} />
      <MapBackToRouteButton visible={isViewingOffRoute} onPress={handleBackToRoute} />
      <MapLocationControls
        followUser={followUser}
        isRefreshing={isRefreshing}
        onRecenter={handleRecenter}
        onRefresh={handleRefreshLocation}
      />
      <AddMarkerFab onPress={handleAddMarker} />
      {showNavigationSheet ? (
        <NavigationBottomSheet
          fromPoint={fromPoint}
          toPoint={toPoint}
          viaPointIds={navigation.viaPointIds}
          routePointIds={navigation.routePointIds}
          distanceMeters={navigation.distanceMeters}
          isComputing={!navigation.isNavigating && navigation.toPointId != null}
          highlightedPointId={highlightedRoutePointId}
          userLatitude={userLatitude}
          userLongitude={userLongitude}
          onHighlightPoint={(pointId) => {
            setFollowUser(false);
            setPinnedCameraPointId(pointId);
            setHighlightedRoutePointId(pointId);
          }}
          userAltitude={userAltitude}
          onChangeFrom={navigation.navigateFromHere}
          onChangeTo={navigation.navigateToInstead}
          onAddVia={navigation.routeThroughHere}
          onRemoveVia={navigation.removeViaPoint}
          onSelectRoute={(pointIds, distance) =>
            applyRouteResult({ pointIds, distanceMeters: distance })
          }
          onClearRoute={navigation.clearNavigation}
        />
      ) : (
        <TrailOnTrackSheet
          match={match}
          isLoading={trackLoading}
          locationError={errorMsg}
          lastKnownLatitude={userLatitude}
          lastKnownLongitude={userLongitude}
        />
      )}
      {overlayMarker ? (
        <MarkerDetailSheet
          marker={overlayMarker}
          distanceMeters={overlayDistanceMeters}
          isLoading={false}
          locationError={errorMsg}
          nearKarura={nearKarura}
          lastKnownLatitude={userLatitude}
          lastKnownLongitude={userLongitude}
          routeIncludesMarker={navigation.isOnActiveRoute(overlayMarker.id)}
          routeSummary={navigation.routeSummary}
          initialSnapIndex={1}
          dismissible
          overlay
          userSelected
          onDismiss={() => setOverlayMarkerId(null)}
          onSetLocationHere={() => setLocationAtMarker(overlayMarker.id)}
          onNavigateTo={() =>
            confirmStartNavigationTo(markerLabel(overlayMarker), () =>
              startNavigationTo(overlayMarker.id),
            )
          }
          onClearRoute={navigation.clearNavigation}
        />
      ) : null}
      <MarkerCaptureSheet
        key={
          captureDraft
            ? `${captureDraft.lng.toFixed(6)}-${captureDraft.lat.toFixed(6)}`
            : "marker-capture"
        }
        visible={captureVisible}
        initialDraft={captureDraft}
        onDismiss={() => {
          setCaptureVisible(false);
          setCaptureDraft(null);
        }}
        onSaved={handleSaved}
        onUseGps={handleUseGps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
