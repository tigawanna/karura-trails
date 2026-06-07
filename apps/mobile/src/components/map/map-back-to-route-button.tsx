import { StyleSheet, View } from "react-native";
import { FAB, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MapBackToRouteButtonProps {
  visible: boolean;
  onPress: () => void;
}

export function MapBackToRouteButton({ visible, onPress }: MapBackToRouteButtonProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 200, left: insets.left + 12 }]}
      pointerEvents="box-none"
    >
      <FAB
        icon="navigation"
        label="Back to route"
        size="small"
        onPress={onPress}
        style={{ backgroundColor: colors.primaryContainer }}
        color={colors.onPrimaryContainer}
        testID="map-back-to-route"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 26,
    elevation: 26,
  },
});
