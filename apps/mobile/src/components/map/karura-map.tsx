import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, useColorScheme, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Camera, Map } from "@maplibre/maplibre-react-native";

import { MapBasemapToggle } from "./map-basemap-toggle";
import { TrailLayer } from "./trail-layer";
import { UserLocationLayer } from "./user-location-layer";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useMapBasemapPreference } from "@/hooks/use-map-basemap-preference";
import {
  calculateBBox,
  combineBBoxes,
  bboxCenter,
  bboxToZoom,
  geomParse,
} from "@/lib/map-libre/geom-parse";
import {
  KARURA_FOREST_CENTER,
  KARURA_DEFAULT_ZOOM,
  normalizeMapColorScheme,
  resolveMapStyle,
} from "@/types/map";
import { useTrails } from "@/hooks/use-trails";

export function KaruraMap() {
  const { colors } = useTheme();
  const colorScheme = normalizeMapColorScheme(useColorScheme());
  const { preset, setPreset, isReady: basemapReady } = useMapBasemapPreference();
  const mapStyle = resolveMapStyle(preset, colorScheme);
  const { location } = useDeviceLocation();
  const [mapReady, setMapReady] = useState(false);

  const { data: trails, isLoading: trailsLoading } = useTrails();

  useEffect(() => {
    setMapReady(false);
  }, [mapStyle]);

  const camera = useMemo(() => {
    if (!trails || trails.length === 0) {
      return {
        center: KARURA_FOREST_CENTER,
        zoom: KARURA_DEFAULT_ZOOM,
        duration: 0,
      };
    }

    const bboxes = trails.map((t) => calculateBBox(geomParse(t.geom)));
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
  }, [trails, mapReady]);

  return (
    <View style={styles.container}>
      {(trailsLoading || !basemapReady) && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.loadingOverlay,
            { backgroundColor: colors.backdrop },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.onSurface, marginTop: 8 }}>
            {!basemapReady ? "Loading map…" : "Loading trails…"}
          </Text>
        </View>
      )}
      {basemapReady ? (
        <Map style={styles.map} mapStyle={mapStyle} onDidFinishLoadingMap={() => setMapReady(true)}>
          <Camera center={camera.center} zoom={camera.zoom} duration={camera.duration} />

          {trails && trails.length > 0 && <TrailLayer trails={trails} />}

          {location && (
            <UserLocationLayer
              longitude={location.coords.longitude}
              latitude={location.coords.latitude}
            />
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
