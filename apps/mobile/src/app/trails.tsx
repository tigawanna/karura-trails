import { enrichedRoutingPointsQueryOptions } from "@/data-access-layer/routing-graph";
import { LoadingState } from "@/components/ui/loading-state";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

import { MaxContentWidth, Spacing } from "@/theme";

export default function TrailsScreen() {
  const { colors } = useTheme();
  const { data: markers, isLoading } = useQuery(enrichedRoutingPointsQueryOptions);

  if (isLoading) {
    return <LoadingState message="Loading markers…" testID="trails-loading" />;
  }

  if (!markers || markers.length === 0) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>
          No markers found
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
          Marker data will appear here once the routing graph has been seeded.
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
          Karura Markers
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          {markers.length} routing markers in the graph
        </Text>
      </View>

      {markers.map((marker) => (
        <Card key={marker.id} style={styles.card} testID={`marker-card-${marker.id}`}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={{ color: colors.onSurface }}>
              {marker.ref ?? marker.name ?? `#${marker.id}`}
            </Text>
            {marker.name && marker.ref && marker.name !== marker.ref ? (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {marker.name}
              </Text>
            ) : null}
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {[marker.markerKind, marker.category, marker.nodeRole, marker.featureLabels]
                .filter(Boolean)
                .join(" · ")}
              {marker.elevation != null ? ` · ${Math.round(marker.elevation)} m` : ""}
            </Text>
            {marker.description ? (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                {marker.description}
              </Text>
            ) : null}
          </Card.Content>
        </Card>
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
  card: {
    backgroundColor: "transparent",
  },
  cardContent: {
    gap: 2,
  },
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
