import { LegendList } from "@legendapp/list/react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Searchbar, Text, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";

import { LoadingState } from "@/components/ui/loading-state";
import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import { enrichedRoutingPointsQueryOptions } from "@/data-access-layer/routing-graph";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel } from "@/geo/nearest-marker";
import { markerListKey, useMarkersFilter } from "@/hooks/use-markers-filter";
import { MaxContentWidth, Spacing } from "@/theme";

function MarkerListItem({ marker }: { marker: EnrichedRoutingPoint }) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card} testID={`marker-card-${marker.id}`}>
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
  );
}

export function MarkersScreen() {
  const { colors } = useTheme();
  const { isPending } = useQuery({
    ...enrichedRoutingPointsQueryOptions,
    placeholderData: (previous) => previous,
  });
  const { data: landmarkCatalog = [] } = useQuery(landmarkTypesQueryOptions);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFeatureSlugs, setActiveFeatureSlugs] = useState<string[]>([]);

  const { markers, totalCount, isLoading } = useMarkersFilter(searchQuery, activeFeatureSlugs);

  const filterChips = useMemo(
    () => landmarkCatalog.filter((entry) => entry.slug.trim().length > 0),
    [landmarkCatalog],
  );

  const toggleFeatureSlug = (slug: string) => {
    setActiveFeatureSlugs((current) =>
      current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug],
    );
  };

  if (isPending && totalCount === 0) {
    return <LoadingState message="Loading markers…" testID="markers-loading" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="markers-screen">
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: "700" }}>
          Markers
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          {markers.length === totalCount
            ? `${totalCount} routing markers`
            : `${markers.length} of ${totalCount} markers`}
        </Text>
        <Searchbar
          placeholder="Search by name, ref, or landmark type…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
          inputStyle={{ color: colors.onSurface }}
          iconColor={colors.onSurfaceVariant}
          placeholderTextColor={colors.onSurfaceVariant}
          testID="markers-search"
        />
        {filterChips.length > 0 ? (
          <LegendList
            horizontal
            data={filterChips}
            keyExtractor={(entry) => entry.slug}
            estimatedItemSize={80}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            renderItem={({ item }) => {
              const selected = activeFeatureSlugs.includes(item.slug);
              return (
                <Chip
                  compact
                  selected={selected}
                  onPress={() => toggleFeatureSlug(item.slug)}
                  style={styles.chip}
                  testID={`markers-filter-${item.slug}`}
                >
                  {item.label}
                </Chip>
              );
            }}
          />
        ) : null}
      </View>

      {isLoading && markers.length === 0 ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : markers.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="titleMedium" style={{ color: colors.onSurface }}>
            No matching markers
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: colors.onSurfaceVariant, textAlign: "center" }}
          >
            Try a different keyword or clear the landmark filters.
          </Text>
        </View>
      ) : (
        <LegendList
          data={markers}
          keyExtractor={markerListKey}
          estimatedItemSize={96}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MarkerListItem marker={item} />}
          recycleItems
          testID="markers-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  searchbar: {
    borderRadius: 14,
    elevation: 0,
  },
  chipRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    marginRight: 0,
  },
  listContent: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    backgroundColor: "transparent",
  },
  cardContent: {
    gap: 2,
  },
  inlineLoading: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
