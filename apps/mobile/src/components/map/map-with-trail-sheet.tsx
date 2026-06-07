import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { capturedPointsQueryOptions } from "@/data-access-layer/points";
import { AddMarkerFab } from "@/components/map/add-marker-fab";
import { KaruraMap } from "@/components/map/karura-map";
import { MapDrawerButton } from "@/components/map/map-drawer-button";
import { MarkerCaptureSheet } from "@/components/markers/marker-capture-sheet";
import { TrailOnTrackSheet } from "@/components/trails/trail-on-track-sheet";
import { useDeviceLocation } from "@/hooks/use-device-location";
import type { MarkerCaptureDraft } from "@/hooks/use-marker-capture";
import { useTrailOnTrack } from "@/hooks/use-trail-on-track";

export function MapWithTrailSheet() {
  const { match, errorMsg, isLoading } = useTrailOnTrack();
  const { location } = useDeviceLocation();
  const { data: capturedPoints = [] } = useQuery(capturedPointsQueryOptions);

  const [captureVisible, setCaptureVisible] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<MarkerCaptureDraft | null>(null);

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
    if (location) {
      openCapture({
        lng: location.coords.longitude,
        lat: location.coords.latitude,
        gpsAltitude: location.coords.altitude,
      });
      return;
    }

    openCapture({
      lng: 36.82,
      lat: -1.24,
      gpsAltitude: null,
    });
  }, [location, openCapture]);

  const handleMapLongPress = useCallback(
    (lng: number, lat: number) => {
      openCapture({
        lng,
        lat,
        gpsAltitude: location?.coords.altitude ?? null,
      });
    },
    [location?.coords.altitude, openCapture],
  );

  const handleUseGps = useCallback(() => {
    if (!location) {
      return;
    }
    setCaptureDraft({
      lng: location.coords.longitude,
      lat: location.coords.latitude,
      gpsAltitude: location.coords.altitude,
    });
  }, [location]);

  const handleSaved = useCallback(() => {
    setCaptureVisible(false);
    setCaptureDraft(null);
  }, []);

  return (
    <View style={styles.container} testID="map-with-trail-sheet">
      <KaruraMap
        capturedPoints={capturedPoints}
        draftCoordinate={captureVisible ? draftCoordinate : null}
        onLongPress={handleMapLongPress}
      />
      <MapDrawerButton />
      <AddMarkerFab onPress={handleAddMarker} />
      <TrailOnTrackSheet match={match} isLoading={isLoading} locationError={errorMsg} />
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
