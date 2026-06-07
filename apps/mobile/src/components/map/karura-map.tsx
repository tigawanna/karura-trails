import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { ActivityIndicator, StyleSheet, useColorScheme, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { PressEvent } from "@maplibre/maplibre-react-native";
import { Camera, Map } from "@maplibre/maplibre-react-native";

import { CapturedPointsLayer } from "./captured-points-layer";
import { MapBasemapToggle } from "./map-basemap-toggle";
import { RoutePreviewLayer } from "./route-preview-layer";
import { RoutingPointsLayer } from "./routing-points-layer";
import { UserLocationLayer } from "./user-location-layer";
import type { PointWithGeometry } from "@/data-access-layer/points";
import { findNearestMarker } from "@/geo/nearest-marker";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useMapBasemapPreference } from "@/hooks/use-map-basemap-preference";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import { calculateBBox, combineBBoxes, bboxCenter, bboxToZoom, geomParse } from "@/geo/geom-parse";
import { KARURA_FOREST_CENTER, KARURA_DEFAULT_ZOOM } from "@/geo/karura-bounds";
import { normalizeMapColorScheme, resolveMapStyle } from "@/lib/map-libre/map-style";

const MARKER_HIT_RADIUS_METERS = 35;
const FOCUS_MARKER_ZOOM = 17.5;
const FOLLOW_USER_ZOOM = 17;

interface KaruraMapProps {
  capturedPoints?: PointWithGeometry[];
  draftCoordinate?: { lng: number; lat: number } | null;
  focusPointId?: number | null;
  routePointIds?: number[];
  userLocation?: { latitude: number; longitude: number } | null;
  userHeading?: number | null;
  followUserLocation?: boolean;
  recenterKey?: number;
  enableMarkerCapture?: boolean;
  onLongPress?: (lng: number, lat: number) => void;
  onMarkerPress?: (pointId: number) => void;
  onMarkerLongPress?: (pointId: number) => void;
  onUserInteraction?: () => void;
}

export function KaruraMap({
  capturedPoints = [],
  draftCoordinate = null,
  focusPointId = null,
  routePointIds = [],
  userLocation = null,
  userHeading = null,
  followUserLocation = false,
  recenterKey = 0,
  enableMarkerCapture = true,
  onLongPress,
  onMarkerPress,
  onMarkerLongPress,
  onUserInteraction,
}: KaruraMapProps) {
  const { colors } = useTheme();
  const colorScheme = normalizeMapColorScheme(useColorScheme());
  const { preset, setPreset, isReady: basemapReady } = useMapBasemapPreference();
  const mapStyle = resolveMapStyle(preset, colorScheme);
  const { location: fallbackLocation } = useDeviceLocation();
  const [mapReady, setMapReady] = useState(false);
  const { enrichedPoints, pointsById, isLoading: graphLoading } = useRoutingGraphData();
  const location = userLocation ?? fallbackLocation?.coords ?? null;

  useEffect(() => {
    setMapReady(false);
  }, [mapStyle]);

  const focusPoint = focusPointId != null ? pointsById.get(focusPointId) : null;

  const camera = useMemo(() => {
    if (followUserLocation && location) {
      return {
        center: [location.longitude, location.latitude] as [number, number],
        zoom: FOLLOW_USER_ZOOM,
        duration: mapReady ? (recenterKey > 0 ? 700 : 250) : 0,
      };
    }

    if (focusPoint) {
      const geometry = geomParse(focusPoint.geom);
      const coordinates = geometry?.coordinates;
      if (coordinates && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
        return {
          center: [coordinates[0], coordinates[1]] as [number, number],
          zoom: FOCUS_MARKER_ZOOM,
          duration: mapReady ? 700 : 0,
        };
      }
    }

    const bboxes = enrichedPoints.map((point) => calculateBBox(geomParse(point.geom)));
    const combined = combineBBoxes(bboxes);
    if (!combined) {
      return {
        center: KARURA_FOREST_CENTER,
        zoom: KARURA_DEFAULT_ZOOM,
        duration: 0,
      };
    }

    return {
      center: bboxCenter(combined),
      zoom: bboxToZoom(combined),
      duration: mapReady ? 1000 : 0,
    };
  }, [enrichedPoints, focusPoint, followUserLocation, location, mapReady, recenterKey]);

  const resolveMarkerAtCoordinate = useCallback(
    (latitude: number, longitude: number) => {
      return findNearestMarker(enrichedPoints, latitude, longitude, MARKER_HIT_RADIUS_METERS);
    },
    [enrichedPoints],
  );

  const handlePress = useCallback(
    (event: NativeSyntheticEvent<PressEvent>) => {
      onUserInteraction?.();
      const [longitude, latitude] = event.nativeEvent.lngLat;
      const hit = resolveMarkerAtCoordinate(latitude, longitude);
      if (hit) {
        onMarkerPress?.(hit.marker.id);
      }
    },
    [onMarkerPress, onUserInteraction, resolveMarkerAtCoordinate],
  );

  const handleLongPress = useCallback(
    (event: NativeSyntheticEvent<PressEvent>) => {
      onUserInteraction?.();
      const [longitude, latitude] = event.nativeEvent.lngLat;
      const hit = resolveMarkerAtCoordinate(latitude, longitude);
      if (hit) {
        if (onMarkerLongPress) {
          onMarkerLongPress(hit.marker.id);
        }
        return;
      }
      if (enableMarkerCapture) {
        onLongPress?.(longitude, latitude);
      }
    },
    [
      enableMarkerCapture,
      onLongPress,
      onMarkerLongPress,
      onUserInteraction,
      resolveMarkerAtCoordinate,
    ],
  );

  const graphLoadingState = graphLoading;

  return (
    <View style={styles.container}>
      {(graphLoadingState || !basemapReady) && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.loadingOverlay,
            { backgroundColor: colors.backdrop },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.onSurface, marginTop: 8 }}>
            {!basemapReady ? "Loading map…" : "Loading trail network…"}
          </Text>
        </View>
      )}
      {basemapReady ? (
        <Map
          style={styles.map}
          mapStyle={mapStyle}
          onDidFinishLoadingMap={() => setMapReady(true)}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onRegionWillChange={onUserInteraction}
        >
          <Camera
            key={
              followUserLocation
                ? `follow-${recenterKey}-${location?.latitude}-${location?.longitude}`
                : `focus-${focusPointId}`
            }
            center={camera.center}
            zoom={camera.zoom}
            duration={camera.duration}
          />

          {routePointIds.length > 1 ? (
            <RoutePreviewLayer routePointIds={routePointIds} pointsById={pointsById} />
          ) : null}

          {enrichedPoints.length > 0 ? <RoutingPointsLayer points={enrichedPoints} /> : null}

          {location ? (
            <UserLocationLayer
              longitude={location.longitude}
              latitude={location.latitude}
              heading={userHeading}
            />
          ) : null}

          {(capturedPoints.length > 0 || draftCoordinate) && (
            <CapturedPointsLayer points={capturedPoints} draftCoordinate={draftCoordinate} />
          )}
        </Map>
      ) : null}

      {basemapReady ? (
        <View style={styles.mapOverlay} pointerEvents="box-none">
          <MapBasemapToggle preset={preset} onPresetChange={setPreset} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    elevation: 20,
  },
  loadingOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
