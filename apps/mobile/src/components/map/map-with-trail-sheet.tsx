import { StyleSheet, View } from "react-native";

import { KaruraMap } from "@/components/map/karura-map";
import { MapDrawerButton } from "@/components/map/map-drawer-button";
import { TrailOnTrackSheet } from "@/components/trails/trail-on-track-sheet";
import { useTrailOnTrack } from "@/hooks/use-trail-on-track";

export function MapWithTrailSheet() {
  const { match, errorMsg, isLoading } = useTrailOnTrack();

  return (
    <View style={styles.container} testID="map-with-trail-sheet">
      <KaruraMap />
      <MapDrawerButton />
      <TrailOnTrackSheet match={match} isLoading={isLoading} locationError={errorMsg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
