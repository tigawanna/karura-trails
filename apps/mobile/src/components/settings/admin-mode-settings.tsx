import { StyleSheet, View } from "react-native";
import { Switch, Text, useTheme } from "react-native-paper";

import { useAdminMode } from "@/hooks/use-admin-mode";
import { useSettingsStore } from "@/stores/settings-store";
import { Spacing } from "@/theme";

export function AdminModeSettings() {
  const { colors } = useTheme();
  const expoAdminMode = useSettingsStore((state) => state.expoAdminMode);
  const setExpoAdminMode = useSettingsStore((state) => state.setExpoAdminMode);
  const adminModeActive = useAdminMode();

  return (
    <View style={styles.section} testID="admin-mode-settings">
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="titleMedium" style={{ color: colors.onSurface }}>
            Expo admin mode
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Tap captured markers on the map and delete local markers from the detail sheet.
          </Text>
        </View>
        <Switch
          value={expoAdminMode}
          onValueChange={setExpoAdminMode}
          testID="admin-mode-toggle"
        />
      </View>
      {adminModeActive ? (
        <Text variant="labelLarge" style={{ color: colors.primary }} testID="admin-mode-active">
          Admin mode active
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
