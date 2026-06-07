import { StyleSheet } from "react-native";
import { FAB, useTheme } from "react-native-paper";

interface AddMarkerFabProps {
  onPress: () => void;
}

export function AddMarkerFab({ onPress }: AddMarkerFabProps) {
  const { colors } = useTheme();

  return (
    <FAB
      icon="map-marker-plus"
      label="Add marker"
      onPress={onPress}
      style={[styles.fab, { backgroundColor: colors.primaryContainer }]}
      color={colors.onPrimaryContainer}
      testID="add-marker-fab"
    />
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 120,
  },
});
