import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Card, Chip, IconButton, Searchbar, Text, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";

import { ClearSearchFiltersButton } from "@/components/common/clear-search-filters-button";
import { LoadingState } from "@/components/ui/loading-state";
import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import { enrichedRoutingPointsQueryOptions } from "@/data-access-layer/routing-graph";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { useMarkerLoadStatus, useReloadMarkerData } from "@/hooks/use-resume-marker-load";
import { markerListKey, useMarkersFilter } from "@/hooks/use-markers-filter";
import { legendListVirtualizationProps } from "@/lib/legend-list/virtualization-props";
import { MaxContentWidth, Spacing } from "@/theme";

const MARKER_ROW_ESTIMATED_SIZE = 96;
const FILTER_CHIP_ESTIMATED_SIZE = 80;
const markerListVirtualization = legendListVirtualizationProps(MARKER_ROW_ESTIMATED_SIZE);
const filterChipListVirtualization = legendListVirtualizationProps(
  FILTER_CHIP_ESTIMATED_SIZE,
  "horizontal",
);

function MarkerListItem({
  marker,
  onPress,
}: {
  marker: EnrichedRoutingPoint;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.cardPressed]}
      testID={`marker-card-${marker.id}`}
    >
      <Card style={styles.card}>
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
    </Pressable>
  );
}

export function MarkersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPending } = useQuery({
    ...enrichedRoutingPointsQueryOptions,
    placeholderData: (previous) => previous,
  });
  const { data: landmarkCatalog = [] } = useQuery(landmarkTypesQueryOptions);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFeatureSlugs, setActiveFeatureSlugs] = useState<string[]>([]);

  const { markers, totalCount, isLoading } = useMarkersFilter(searchQuery, activeFeatureSlugs);
  const statusQuery = useMarkerLoadStatus();
  const reloadMutation = useReloadMarkerData();

  const filterChips = useMemo(
    () => landmarkCatalog.filter((entry) => entry.slug.trim().length > 0),
    [landmarkCatalog],
  );

  const toggleFeatureSlug = (slug: string) => {
    setActiveFeatureSlugs((current) =>
      current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug],
    );
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || activeFeatureSlugs.length > 0;

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFeatureSlugs([]);
  };

  const handleMarkerPress = useCallback(
    (marker: EnrichedRoutingPoint) => {
      router.navigate({
        pathname: "/",
        params: { markerId: String(marker.id) },
      });
    },
    [router],
  );

  if (isPending && totalCount === 0) {
    return <LoadingState testID="markers-loading" embedded />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="markers-screen">
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, flex: 1 }}>
            {markers.length === totalCount
              ? `${totalCount} routing markers`
              : `${markers.length} of ${totalCount} markers`}
          </Text>
          <ClearSearchFiltersButton
            visible={hasActiveFilters}
            onPress={clearAllFilters}
            testID="markers-clear-all"
          />
          <IconButton
            icon="database-refresh"
            accessibilityLabel="Reload map data"
            loading={reloadMutation.isPending}
            disabled={reloadMutation.isPending}
            onPress={() => reloadMutation.mutate()}
            testID="markers-load-button"
          />
        </View>
        {statusQuery.data?.needsAttention ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Some marker links may be incomplete. Reload map data to wipe and replay the saved
            payloads.
          </Text>
        ) : null}
        <Searchbar
          placeholder="Search markers…"
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
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            {...filterChipListVirtualization}
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
        <LoadingState testID="markers-list-loading" embedded />
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
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MarkerListItem marker={item} onPress={() => handleMarkerPress(item)} />
          )}
          recycleItems
          testID="markers-list"
          {...markerListVirtualization}
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
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
  cardPressed: {
    opacity: 0.7,
  },
  cardContent: {
    gap: 2,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
