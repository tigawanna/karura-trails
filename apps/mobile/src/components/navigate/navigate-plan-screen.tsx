import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Searchbar, Text, useTheme } from "react-native-paper";

import { LoadingState } from "@/components/ui/loading-state";
import { suggestRoutesFromPoint } from "@/geo/graph/neighbor-graph";
import { markerLabel } from "@/geo/nearest-marker";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { useMarkerSearch, resolveMarkerByRef } from "@/hooks/use-marker-search";
import { useNearestMarker } from "@/hooks/use-nearest-marker";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import { formatRouteDistance, serializeViaRefs } from "@/lib/navigation/route-params";
import { useNavigationStore } from "@/stores/navigation-store";
import { Spacing } from "@/theme";

type PickerField = "start" | "end" | "via" | null;

function MarkerResultRow({
  marker,
  onPress,
}: {
  marker: EnrichedRoutingPoint;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.resultRow}>
      <Text variant="titleSmall" style={{ color: colors.onSurface }}>
        {markerLabel(marker)}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
        {[marker.markerKind, marker.category, marker.featureLabels].filter(Boolean).join(" · ")}
      </Text>
    </Pressable>
  );
}

export function NavigatePlanScreen() {
  const { colors } = useTheme();
  const { nearest, isLoading: nearestLoading } = useNearestMarker();
  const { graphPoints, graphEdges, pointsById, pointsByRef, isLoading } = useRoutingGraphData();
  const beginNavigation = useNavigationStore((state) => state.beginNavigation);

  const [startRef, setStartRef] = useState<string | null>(null);
  const [endRef, setEndRef] = useState<string | null>(null);
  const [viaRefs, setViaRefs] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<PickerField>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!startRef && nearest?.marker.ref) {
      setStartRef(nearest.marker.ref);
    }
  }, [nearest?.marker.ref, startRef]);

  const searchResults = useMarkerSearch(searchQuery, 16);

  const startPoint = resolveMarkerByRef(pointsByRef, startRef ?? undefined);
  const endPoint = resolveMarkerByRef(pointsByRef, endRef ?? undefined);

  const suggestions = useMemo(() => {
    if (!startPoint) {
      return [];
    }
    return suggestRoutesFromPoint(startPoint.id, graphPoints, graphEdges, 5);
  }, [graphEdges, graphPoints, startPoint]);

  const openRoute = (nextFrom: string, nextTo: string, nextVia: string[] = []) => {
    const startPoint = resolveMarkerByRef(pointsByRef, nextFrom);
    const endPoint = resolveMarkerByRef(pointsByRef, nextTo);
    if (!startPoint || !endPoint) {
      return;
    }

    const viaPointIds = nextVia
      .map((ref) => resolveMarkerByRef(pointsByRef, ref)?.id)
      .filter((value): value is number => value != null);

    beginNavigation({
      fromPointId: startPoint.id,
      toPointId: endPoint.id,
      viaPointIds,
    });

    router.push({
      pathname: "/route",
      params: {
        from: nextFrom,
        to: nextTo,
        via: serializeViaRefs(nextVia),
      },
    });
  };

  const handleSelectMarker = (marker: EnrichedRoutingPoint) => {
    const ref = marker.ref?.trim();
    if (!ref) {
      return;
    }

    if (activeField === "start") {
      setStartRef(ref);
    } else if (activeField === "end") {
      setEndRef(ref);
    } else if (activeField === "via") {
      setViaRefs((current) => (current.includes(ref) ? current : [...current, ref]));
    }

    setActiveField(null);
    setSearchQuery("");
  };

  const removeVia = (ref: string) => {
    setViaRefs((current) => current.filter((entry) => entry !== ref));
  };

  if (isLoading || nearestLoading) {
    return <LoadingState message="Loading trail network…" testID="navigate-loading" />;
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      testID="navigate-plan-screen"
    >
      <Text variant="headlineSmall" style={{ color: colors.onSurface }}>
        Plan a route
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        Pick where you are, where you want to go, and optional stops along the way.
      </Text>

      <View style={styles.fieldGroup}>
        <Text variant="labelLarge" style={{ color: colors.onSurface }}>
          Start
        </Text>
        <Pressable onPress={() => setActiveField("start")}>
          <Searchbar
            placeholder="Current marker"
            value={activeField === "start" ? searchQuery : (startRef ?? "")}
            onChangeText={setSearchQuery}
            onFocus={() => setActiveField("start")}
            editable={activeField === "start"}
            style={styles.searchbar}
          />
        </Pressable>
      </View>

      <View style={styles.fieldGroup}>
        <Text variant="labelLarge" style={{ color: colors.onSurface }}>
          End
        </Text>
        <Pressable onPress={() => setActiveField("end")}>
          <Searchbar
            placeholder="Search destination marker"
            value={activeField === "end" ? searchQuery : (endRef ?? "")}
            onChangeText={setSearchQuery}
            onFocus={() => setActiveField("end")}
            editable={activeField === "end"}
            style={styles.searchbar}
          />
        </Pressable>
      </View>

      <View style={styles.fieldGroup}>
        <Text variant="labelLarge" style={{ color: colors.onSurface }}>
          Via stops
        </Text>
        <View style={styles.chipRow}>
          {viaRefs.map((ref) => (
            <Chip key={ref} onClose={() => removeVia(ref)}>
              {ref}
            </Chip>
          ))}
          <Chip icon="plus" onPress={() => setActiveField("via")}>
            Add stop
          </Chip>
        </View>
        {activeField === "via" ? (
          <Searchbar
            placeholder="Search stop marker"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchbar}
          />
        ) : null}
      </View>

      {activeField ? (
        <View style={styles.resultsCard}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <MarkerResultRow marker={item} onPress={() => handleSelectMarker(item)} />
            )}
            ListEmptyComponent={
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                No markers match that search.
              </Text>
            }
          />
        </View>
      ) : null}

      {startRef && endRef ? (
        <Button
          mode="contained"
          onPress={() => openRoute(startRef, endRef, viaRefs)}
          testID="navigate-open-custom-route"
        >
          Open route on map
        </Button>
      ) : null}

      <View style={styles.section}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>
          Suggested from {startRef ?? "start"}
        </Text>
        {suggestions.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Pick a start marker to see trail options.
          </Text>
        ) : (
          suggestions.map((suggestion) => {
            const start = pointsByRef.get(startRef ?? "");
            const startLabel = start ? markerLabel(start) : (startRef ?? "Start");
            return (
              <Pressable
                key={suggestion.id}
                style={[styles.suggestionCard, { backgroundColor: colors.surface }]}
                onPress={() => {
                  const endMarker = pointsById.get(suggestion.endPointId);
                  const endRefValue = suggestion.endRef ?? endMarker?.ref?.trim();
                  if (!startRef || !endRefValue) {
                    return;
                  }
                  openRoute(startRef, endRefValue, viaRefs);
                }}
                testID={`route-suggestion-${suggestion.endPointId}`}
              >
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>
                  {startLabel} → {suggestion.endLabel}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {formatRouteDistance(suggestion.distanceMeters)} · {suggestion.pointIds.length}{" "}
                  markers
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  searchbar: {
    borderRadius: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  resultsCard: {
    gap: Spacing.two,
  },
  resultRow: {
    paddingVertical: Spacing.two,
    gap: 2,
  },
  section: {
    gap: Spacing.three,
  },
  suggestionCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
