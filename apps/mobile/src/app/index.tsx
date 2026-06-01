import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { KaruraMap } from "@/components/map/karura-map";

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KaruraMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
