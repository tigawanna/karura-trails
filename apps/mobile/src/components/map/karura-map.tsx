import React, { useEffect, useMemo, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { ActivityIndicator, StyleSheet, useColorScheme, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { PressEvent } from "@maplibre/maplibre-react-native";
import { Camera, Map } from "@maplibre/maplibre-react-native";

import { CapturedPointsLayer } from "./captured-points-layer";
import { MapBasemapToggle } from "./map-basemap-toggle";
import { NeighborLinksLayer } from "./neighbor-links-layer";
import { RoutingPointsLayer } from "./routing-points-layer";
import { UserLocationLayer } from "./user-location-layer";
import type { PointWithGeometry } from "@/data-access-layer/points";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useMapBasemapPreference } from "@/hooks/use-map-basemap-preference";
import { useNeighborLinks, useRoutingPoints } from "@/hooks/use-routing-graph";
import { calculateBBox, combineBBoxes, bboxCenter, bboxToZoom, geomParse } from "@/geo/geom-parse";
import { KARURA_FOREST_CENTER, KARURA_DEFAULT_ZOOM } from "@/geo/karura-bounds";
import { normalizeMapColorScheme, resolveMapStyle } from "@/lib/map-libre/map-style";

interface KaruraMapProps {
  capturedPoints?: PointWithGeometry[];
  draftCoordinate?: { lng: number; lat: number } | null;
  onLongPress?: (lng: number, lat: number) => void;
}

export function KaruraMap({
  capturedPoints = [],
  draftCoordinate = null,
  onLongPress,
}: KaruraMapProps) {
  const { colors } = useTheme();
  const colorScheme = normalizeMapColorScheme(useColorScheme());
  const { preset, setPreset, isReady: basemapReady } = useMapBasemapPreference();
  const mapStyle = resolveMapStyle(preset, colorScheme);
  const { location } = useDeviceLocation();
  const [mapReady, setMapReady] = useState(false);

  const { data: routingPoints, isLoading: pointsLoading } = useRoutingPoints();
  const { data: neighborLinks, isLoading: linksLoading } = useNeighborLinks();

  useEffect(() => {
    setMapReady(false);
  }, [mapStyle]);

  const camera = useMemo(() => {
    const bboxes = (routingPoints ?? []).map((point) => calculateBBox(geomParse(point.geom)));
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
  }, [routingPoints, mapReady]);

  const handleLongPress = (event: NativeSyntheticEvent<PressEvent>) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    onLongPress?.(longitude, latitude);
  };

  const graphLoading = pointsLoading || linksLoading;

  return (
    <View style={styles.container}>
      {(graphLoading || !basemapReady) && (
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
          onLongPress={onLongPress ? handleLongPress : undefined}
        >
          <Camera center={camera.center} zoom={camera.zoom} duration={camera.duration} />

          {neighborLinks && neighborLinks.length > 0 ? (
            <NeighborLinksLayer links={neighborLinks} />
          ) : null}

          {routingPoints && routingPoints.length > 0 ? (
            <RoutingPointsLayer points={routingPoints} />
          ) : null}

          {location && (
            <UserLocationLayer
              longitude={location.coords.longitude}
              latitude={location.coords.latitude}
            />
          )}

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
