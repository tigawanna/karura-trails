import { StyleSheet, View } from "react-native";
import { Chip, HelperText, Text, useTheme } from "react-native-paper";

import { MARKER_CATEGORY_OPTIONS } from "@/geo/marker-category-options";
import { toggleMarkerCategory } from "@/geo/marker-categories";
import type { PointCategory } from "@/lib/drizzle/schema/points";
import { Spacing } from "@/theme";

interface MarkerCategoryPickerProps {
  selected: PointCategory[];
  onChange: (categories: PointCategory[]) => void;
}

export function MarkerCategoryPicker({ selected, onChange }: MarkerCategoryPickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={{ color: colors.onSurface }}>
        Categories
      </Text>
      <HelperText type="info" visible style={styles.helper}>
        Select all that apply
      </HelperText>
      <View style={styles.chipRow}>
        {MARKER_CATEGORY_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            selected={selected.includes(option.value)}
            onPress={() => onChange(toggleMarkerCategory(selected, option.value))}
            style={styles.chip}
            testID={`marker-category-${option.value}`}
          >
            {option.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
  helper: {
    marginTop: 0,
    paddingTop: 0,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  chip: {
    marginBottom: Spacing.half,
  },
});
