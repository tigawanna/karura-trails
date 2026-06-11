import { customTheme, type CustomThemeKey } from "@/constants/Colors";
import { useSettingsStore, useThemeStore } from "@/stores/settings-store";
import { startTransition } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Divider, Icon, List, Switch, useTheme } from "react-native-paper";

export function AppearanceSettings() {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const dynamicColors = useSettingsStore((state) => state.dynamicColors);
  const colorScheme = useSettingsStore((state) => state.colorScheme);
  const toggleDynamicColors = useSettingsStore((state) => state.toggleDynamicColors);
  const setColorScheme = useSettingsStore((state) => state.setColorScheme);

  const colorSchemeOptions = Object.entries(customTheme).map(([key, value]) => ({
    key: key as CustomThemeKey,
    color: value.light.primary,
  }));

  return (
    <List.Section>
      <List.Subheader style={styles.listSubHeader}>Appearance</List.Subheader>
      <List.Item
        title="Dark Mode"
        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
        right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
      />
      <List.Item
        title="Dynamic Colors"
        description="Use Material You color palette"
        left={(props) => <List.Icon {...props} icon="palette" />}
        right={() => <Switch value={dynamicColors} onValueChange={toggleDynamicColors} />}
      />
      <List.Item
        title="Color Scheme"
        left={(props) => <List.Icon {...props} icon="palette-swatch" />}
      />
      <View style={styles.colorContainer}>
        {colorSchemeOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => startTransition(() => setColorScheme(option.key))}
            style={styles.colorDot}>
            <View
              style={[
                styles.colorCircle,
                {
                  backgroundColor: option.color,
                  borderRadius: colorScheme === option.key ? 4 : 18,
                },
              ]}>
              {colorScheme === option.key && (
                <Icon source="check" size={20} color={theme.colors.onPrimary} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Divider />
    </List.Section>
  );
}

const styles = StyleSheet.create({
  listSubHeader: {
    fontSize: 16,
    fontWeight: "bold",
  },
  colorContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  colorDot: {
    marginBottom: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
