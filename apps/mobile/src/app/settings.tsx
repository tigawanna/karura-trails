import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, List, Text, useTheme } from "react-native-paper";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { LocationSpoofSettings } from "@/components/dev/location-spoof-settings";
import { isDevBuild } from "@/lib/dev/is-dev-build";
import { MaxContentWidth, Spacing } from "@/theme";

export default function SettingsScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      testID="settings-screen"
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}>
      <AppearanceSettings />

      {isDevBuild() ? (
        <View style={styles.devSection}>
          <Divider />
          <List.Subheader style={styles.devSubheader}>Developer</List.Subheader>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Tools for testing the app without being in the forest.
          </Text>
          <LocationSpoofSettings />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  devSection: {
    gap: Spacing.two,
  },
  devSubheader: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
