import { LegendList } from "@legendapp/list/react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Searchbar, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ClearSearchFiltersButton } from "@/components/common/clear-search-filters-button";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel, pointCoordinates } from "@/geo/nearest-marker";
import { useMarkerSearch } from "@/hooks/use-marker-search";
import { Spacing } from "@/theme";

interface MapMarkerSearchProps {
  onSelectMarker: (marker: EnrichedRoutingPoint) => void;
}

export function MapMarkerSearch({ onSelectMarker }: MapMarkerSearchProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const results = useMarkerSearch(query, 10);
  const showResults = expanded && query.trim().length > 0;

  const handleSelect = (marker: EnrichedRoutingPoint) => {
    onSelectMarker(marker);
    setQuery("");
    setExpanded(false);
  };

  const resultSummary = useMemo(() => {
    if (!showResults) {
      return null;
    }
    return `${results.length} result${results.length === 1 ? "" : "s"}`;
  }, [results.length, showResults]);

  const clearSearch = () => {
    setQuery("");
    setExpanded(false);
  };

  return (
    <View
      style={[styles.container, { top: insets.top + 8, right: insets.right + 8 }]}
      testID="map-marker-search"
    >
      <Searchbar
        placeholder="Find a marker…"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setExpanded(true);
        }}
        onFocus={() => setExpanded(true)}
        onClearIconPress={clearSearch}
        style={[styles.searchbar, { backgroundColor: colors.surface }]}
        inputStyle={{ color: colors.onSurface, minHeight: 0 }}
        iconColor={colors.onSurfaceVariant}
        placeholderTextColor={colors.onSurfaceVariant}
        testID="map-marker-search-input"
      />
      <ClearSearchFiltersButton
        visible={query.trim().length > 0}
        onPress={clearSearch}
        testID="map-marker-search-clear-all"
      />
      {showResults ? (
        <View style={[styles.resultsPanel, { backgroundColor: colors.surface }]}>
          {resultSummary ? (
            <Text
              variant="labelSmall"
              style={{ color: colors.onSurfaceVariant, paddingHorizontal: Spacing.three }}
            >
              {resultSummary}
            </Text>
          ) : null}
          <LegendList
            data={results}
            keyExtractor={(marker) => String(marker.id)}
            estimatedItemSize={56}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const coordinates = pointCoordinates(item);
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={styles.resultRow}
                  testID={`map-marker-search-result-${item.id}`}
                >
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <View style={styles.resultText}>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface }} numberOfLines={1}>
                      {markerLabel(item)}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.onSurfaceVariant }}
                      numberOfLines={1}
                    >
                      {[item.featureLabels, item.category].filter(Boolean).join(" · ")}
                      {coordinates
                        ? ` · ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                        : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 64,
    zIndex: 25,
    elevation: 25,
    gap: Spacing.one,
  },
  searchbar: {
    borderRadius: 14,
    elevation: 2,
    height: 44,
  },
  resultsPanel: {
    borderRadius: 14,
    maxHeight: 280,
    overflow: "hidden",
    elevation: 4,
    paddingVertical: Spacing.one,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
});
