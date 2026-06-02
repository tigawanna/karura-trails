import { Redirect } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { LocationSpoofSettings } from "@/components/dev/location-spoof-settings";
import { isDevBuild } from "@/lib/dev/is-dev-build";
import { MaxContentWidth, Spacing } from "@/theme";

export default function SettingsScreen() {
  const { colors } = useTheme();

  if (!isDevBuild()) {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView
      testID="settings-screen"
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: "700" }}>
        Developer settings
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        Tools for testing the app without being in the forest.
      </Text>

      <LocationSpoofSettings />
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
});
