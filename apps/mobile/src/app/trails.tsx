import { trailsQueryOptions } from "@/data-access-layer/trails";
import { LoadingState } from "@/components/ui/loading-state";
import { TrailCard } from "@/components/trails/trail-card";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { MaxContentWidth, Spacing } from "@/theme";

export default function TrailsScreen() {
  const { colors } = useTheme();
  const { data: trails, isLoading: trailsLoading } = useQuery(trailsQueryOptions);

  if (trailsLoading) {
    return <LoadingState message="Loading trails…" testID="trails-loading" />;
  }

  if (!trails || trails.length === 0) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>
          No trails found
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
          Trail data will appear here once the database has been seeded.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      testID="trails-scroll"
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: "700" }}>
          Karura Trails
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          {trails.length} {trails.length === 1 ? "trail" : "trails"} in the forest
        </Text>
      </View>

      {trails.map((trail) => (
        <TrailCard key={trail.id} trail={trail} testID={`trail-card-${trail.slug}`} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
