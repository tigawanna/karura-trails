import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { StyleSheet, View } from "react-native";
import { IconButton, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MapDrawerButton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View
      style={[styles.container, { top: insets.top + 8, left: insets.left + 8 }]}
      testID="map-drawer-button"
    >
      <IconButton
        icon={({ size, color }) => <MaterialCommunityIcons name="menu" size={size} color={color} />}
        mode="contained"
        containerColor={colors.surface}
        iconColor={colors.onSurface}
        size={22}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        testID="map-drawer-button-pressable"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
  },
});
