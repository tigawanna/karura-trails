import { Pressable, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { Spacing } from "@/theme";

interface ClearSearchFiltersButtonProps {
  visible: boolean;
  onPress: () => void;
  testID?: string;
}

export function ClearSearchFiltersButton({
  visible,
  onPress,
  testID = "clear-search-filters",
}: ClearSearchFiltersButtonProps) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Clear all search and filters"
    >
      <Text variant="labelLarge" style={{ color: colors.primary, fontWeight: "600" }}>
        Clear all
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
});
