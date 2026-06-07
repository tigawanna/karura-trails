import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { capturedPointsQueryOptions } from "@/data-access-layer/points";
import { AddMarkerFab } from "@/components/map/add-marker-fab";
import { KaruraMap } from "@/components/map/karura-map";
import {
  MarkerDetailSheet,
  markerDistanceFromLocation,
} from "@/components/map/marker-detail-sheet";
import { NavigationBottomSheet } from "@/components/map/navigation-bottom-sheet";
import { MapDrawerButton } from "@/components/map/map-drawer-button";
import { MarkerCaptureSheet } from "@/components/markers/marker-capture-sheet";
import { markerLabel } from "@/geo/nearest-marker";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useLiveLocation } from "@/hooks/use-live-location";
import type { MarkerCaptureDraft } from "@/hooks/use-marker-capture";
import { useNavigationController } from "@/hooks/use-navigation-controller";
import { useNearestMarker } from "@/hooks/use-nearest-marker";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import { buildMarkerNavigationActions, showMarkerActionMenu } from "@/lib/ui/marker-action-menu";
import { useNavigationStore } from "@/stores/navigation-store";

export function MapWithTrailSheet() {
  const { nearest, nearKarura, errorMsg, isLoading } = useNearestMarker();
  const { location: staticLocation } = useDeviceLocation();
  const { enrichedPoints, pointsById } = useRoutingGraphData();
  const { data: capturedPoints = [] } = useQuery(capturedPointsQueryOptions);

  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null);
  const [highlightedRoutePointId, setHighlightedRoutePointId] = useState<number | null>(null);
  const [captureVisible, setCaptureVisible] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<MarkerCaptureDraft | null>(null);

  const applyRouteResult = useNavigationStore((state) => state.applyRouteResult);

  const activeLocation = useLiveLocation(true);
  const userLatitude = activeLocation?.coords.latitude ?? staticLocation?.coords.latitude ?? null;
  const userLongitude =
    activeLocation?.coords.longitude ?? staticLocation?.coords.longitude ?? null;

  const navigation = useNavigationController({
    enrichedPoints,
    userLatitude,
    userLongitude,
  });

  const heading = useDeviceHeading(Boolean(userLatitude && userLongitude));

  useEffect(() => {
    if (selectedMarkerId == null && nearest?.marker.id) {
      setSelectedMarkerId(nearest.marker.id);
    }
  }, [nearest?.marker.id, selectedMarkerId]);

  const selectedMarker = useMemo((): EnrichedRoutingPoint | null => {
    if (selectedMarkerId == null) {
      return nearest?.marker ?? null;
    }
    return pointsById.get(selectedMarkerId) ?? nearest?.marker ?? null;
  }, [nearest?.marker, pointsById, selectedMarkerId]);

  const displayMarker = useMemo(() => {
    if (navigation.toPointId != null) {
      return pointsById.get(navigation.toPointId) ?? selectedMarker;
    }
    return selectedMarker;
  }, [navigation.toPointId, pointsById, selectedMarker]);

  const fromPoint = useMemo(
    () =>
      navigation.fromPointId != null ? (pointsById.get(navigation.fromPointId) ?? null) : null,
    [navigation.fromPointId, pointsById],
  );

  const toPoint = useMemo(
    () => (navigation.toPointId != null ? (pointsById.get(navigation.toPointId) ?? null) : null),
    [navigation.toPointId, pointsById],
  );

  const showNavigationSheet = navigation.toPointId != null;

  useEffect(() => {
    if (!showNavigationSheet) {
      setHighlightedRoutePointId(null);
    }
  }, [showNavigationSheet]);

  const mapFocusPointId =
    highlightedRoutePointId ?? displayMarker?.id ?? navigation.toPointId ?? null;

  const mapLocation = useMemo(() => {
    if (userLatitude == null || userLongitude == null) {
      return null;
    }
    return { latitude: userLatitude, longitude: userLongitude };
  }, [userLatitude, userLongitude]);

  const distanceMeters = useMemo(() => {
    if (!displayMarker || !mapLocation || !nearKarura) {
      return nearest?.distanceMeters ?? null;
    }
    return markerDistanceFromLocation(displayMarker, mapLocation.latitude, mapLocation.longitude);
  }, [displayMarker, mapLocation, nearKarura, nearest?.distanceMeters]);

  const draftCoordinate = useMemo(() => {
    if (!captureDraft) {
      return null;
    }
    return { lng: captureDraft.lng, lat: captureDraft.lat };
  }, [captureDraft]);

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

      setSelectedMarkerId(markerId);
    },
    [navigation, pointsById],
  );

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
        onNavigateTo: () => startNavigationTo(markerId),
        onNavigateHereInstead: () => {
          navigation.navigateToInstead(markerId);
          setSelectedMarkerId(markerId);
        },
        onRouteThroughHere: () => {
          navigation.routeThroughHere(markerId);
          setSelectedMarkerId(markerId);
        },
        onRemoveFromRoute: () => navigation.removeFromRoute(markerId),
        onRemoveViaStop: () => navigation.removeViaPoint(markerId),
        onUnblockPoint: () => navigation.unblockPoint(markerId),
        onViewDetails: () => setSelectedMarkerId(markerId),
      });

      showMarkerActionMenu({
        markerLabel: markerLabel(marker),
        actions,
      });
    },
    [navigation, pointsById, startNavigationTo],
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
        userLocation={mapLocation}
        userHeading={heading}
        onLongPress={handleMapLongPress}
        onMarkerPress={setSelectedMarkerId}
        onMarkerLongPress={handleMarkerLongPress}
      />
      <MapDrawerButton />
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
          onHighlightPoint={setHighlightedRoutePointId}
          onAddVia={navigation.routeThroughHere}
          onRemoveVia={navigation.removeViaPoint}
          onSelectRoute={(pointIds, distance) =>
            applyRouteResult({ pointIds, distanceMeters: distance })
          }
          onClearRoute={navigation.clearNavigation}
        />
      ) : (
        <MarkerDetailSheet
          marker={displayMarker}
          distanceMeters={distanceMeters}
          isLoading={isLoading}
          locationError={errorMsg}
          nearKarura={nearKarura}
          initialSnapIndex={1}
          onNavigateTo={displayMarker ? () => startNavigationTo(displayMarker.id) : undefined}
        />
      )}
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
