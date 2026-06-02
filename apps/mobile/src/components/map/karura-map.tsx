import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { Camera, Map } from "@maplibre/maplibre-react-native";

import { TrailLayer } from "./trail-layer";
import { UserLocationLayer } from "./user-location-layer";
import { useDeviceLocation } from "@/hooks/use-device-location";
import {
  calculateBBox,
  combineBBoxes,
  bboxCenter,
  bboxToZoom,
  geomParse,
} from "@/lib/map-libre/geom-parse";
import { KARURA_FOREST_CENTER, KARURA_DEFAULT_ZOOM, OPENFREEMAP_POSITRON_STYLE } from "@/types/map";
import { useTrails } from "@/hooks/use-trails";

export function KaruraMap() {
  const { colors } = useTheme();
  const { location } = useDeviceLocation();
  const [mapReady, setMapReady] = useState(false);

  const { data: trails, isLoading: trailsLoading } = useTrails();

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
      {trailsLoading && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.loadingOverlay,
            { backgroundColor: colors.backdrop },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.onSurface, marginTop: 8 }}>Loading trails...</Text>
        </View>
      )}
      <Map
        style={styles.map}
        mapStyle={OPENFREEMAP_POSITRON_STYLE}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        <Camera center={camera.center} zoom={camera.zoom} duration={camera.duration} />

        {trails && trails.length > 0 && <TrailLayer trails={trails} />}

        {location && (
          <UserLocationLayer
            longitude={location.coords.longitude}
            latitude={location.coords.latitude}
          />
        )}
      </Map>
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
  loadingOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
