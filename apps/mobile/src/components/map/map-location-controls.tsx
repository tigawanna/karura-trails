import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, IconButton, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MapLocationControlsProps {
  followUser: boolean;
  isRefreshing: boolean;
  onRecenter: () => void;
  onRefresh: () => void;
}

export function MapLocationControls({
  followUser,
  isRefreshing,
  onRecenter,
  onRefresh,
}: MapLocationControlsProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 140, right: insets.right + 12 }]}
      testID="map-location-controls"
    >
      <IconButton
        icon={({ size, color }) =>
          isRefreshing ? (
            <ActivityIndicator size={size - 4} color={color} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={size} color={color} />
          )
        }
        mode="contained"
        containerColor={colors.surface}
        iconColor={colors.primary}
        size={22}
        onPress={onRefresh}
        disabled={isRefreshing}
        testID="map-location-refresh"
      />
      <IconButton
        icon={({ size, color }) => (
          <MaterialCommunityIcons
            name={followUser ? "navigation" : "navigation-outline"}
            size={size}
            color={color}
          />
        )}
        mode="contained"
        containerColor={followUser ? colors.primaryContainer : colors.surface}
        iconColor={followUser ? colors.onPrimaryContainer : colors.onSurface}
        size={22}
        onPress={onRecenter}
        testID="map-location-recenter"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 25,
    elevation: 25,
    gap: 8,
  },
});
