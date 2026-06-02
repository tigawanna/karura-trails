import { StyleSheet, View } from "react-native";

import { KaruraMap } from "@/components/map/karura-map";

export default function MapScreen() {
  return (
    <View style={styles.container} testID="map-screen">
      <KaruraMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
