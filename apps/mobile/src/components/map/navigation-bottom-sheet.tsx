import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Chip, Searchbar, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findRouteAlternatives } from "@/geo/graph/neighbor-graph";
import { markerLabel } from "@/geo/nearest-marker";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { useMarkerSearch } from "@/hooks/use-marker-search";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import { formatRouteDistance } from "@/lib/navigation/route-params";
import { useNavigationStore } from "@/stores/navigation-store";
import { Spacing } from "@/theme";
import { ClearSearchFiltersButton } from "@/components/common/clear-search-filters-button";
import {
  getUpcomingRouteMarkers,
  RouteElevationChart,
} from "@/components/map/route-elevation-chart";

const ROUTE_PREVIEW_NODE_LIMIT = 7;

interface NavigationBottomSheetProps {
  fromPoint: EnrichedRoutingPoint | null;
  toPoint: EnrichedRoutingPoint | null;
  viaPointIds: number[];
  routePointIds: number[];
  distanceMeters: number;
  isComputing: boolean;
  highlightedPointId: number | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
  userAltitude?: number | null;
  onHighlightPoint: (pointId: number) => void;
  onChangeFrom: (pointId: number) => void;
  onChangeTo: (pointId: number) => void;
  onAddVia: (pointId: number) => void;
  onRemoveVia: (pointId: number) => void;
  onSelectRoute: (pointIds: number[], distanceMeters: number) => void;
  onClearRoute: () => void;
}

export function NavigationBottomSheet({
  fromPoint,
  toPoint,
  viaPointIds,
  routePointIds,
  distanceMeters,
  isComputing,
  highlightedPointId,
  userLatitude = null,
  userLongitude = null,
  userAltitude = null,
  onHighlightPoint,
  onChangeFrom,
  onChangeTo,
  onAddVia,
  onRemoveVia,
  onSelectRoute,
  onClearRoute,
}: NavigationBottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["18%", "58%"], []);
  const { graphPoints, graphEdges, pointsById } = useRoutingGraphData();
  const blockedPointIds = useNavigationStore((state) => state.blockedPointIds);

  const [viaSearch, setViaSearch] = useState("");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [editingFrom, setEditingFrom] = useState(false);
  const [editingTo, setEditingTo] = useState(false);
  const viaSearchResults = useMarkerSearch(viaSearch, 8);
  const fromSearchResults = useMarkerSearch(fromSearch, 8);
  const toSearchResults = useMarkerSearch(toSearch, 8);

  useEffect(() => {
    sheetRef.current?.snapToIndex(1);
  }, [toPoint?.id]);

  const viaPoints = useMemo(
    () =>
      viaPointIds
        .map((id) => pointsById.get(id))
        .filter((point): point is EnrichedRoutingPoint => point != null),
    [pointsById, viaPointIds],
  );

  const routeAlternatives = useMemo(() => {
    if (!fromPoint || !toPoint) {
      return [];
    }
    return findRouteAlternatives(
      fromPoint.id,
      toPoint.id,
      viaPointIds,
      graphPoints,
      graphEdges,
      blockedPointIds,
      3,
    );
  }, [blockedPointIds, fromPoint, graphEdges, graphPoints, toPoint, viaPointIds]);

  const previewNodes = useMemo(() => {
    return routePointIds
      .slice(0, ROUTE_PREVIEW_NODE_LIMIT)
      .map((id) => pointsById.get(id))
      .filter((point): point is EnrichedRoutingPoint => point != null);
  }, [pointsById, routePointIds]);

  const activeRouteKey = routePointIds.join(",");

  const upcomingMarkers = useMemo(
    () => getUpcomingRouteMarkers(routePointIds, pointsById, userLatitude, userLongitude, 10),
    [pointsById, routePointIds, userLatitude, userLongitude],
  );

  const hasActiveViaFilters = viaSearch.trim().length > 0 || viaPoints.length > 0;

  const clearViaFilters = () => {
    setViaSearch("");
    for (const point of viaPoints) {
      onRemoveVia(point.id);
    }
  };

  return (
    <View testID="navigation-bottom-sheet" style={styles.sheetHost}>
      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.onSurfaceVariant, width: 44 }}
        bottomInset={insets.bottom}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
        >
          <View style={styles.header}>
            <Text variant="labelLarge" style={[styles.eyebrow, { color: colors.primary }]}>
              NAVIGATION
            </Text>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
              Navigating to {toPoint ? markerLabel(toPoint) : "…"}
            </Text>
            {isComputing ? (
              <View style={styles.computingRow}>
                <LoadingIndicator size="small" />
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                {formatRouteDistance(distanceMeters)} · {routePointIds.length} markers
              </Text>
            )}
          </View>

          <View style={[styles.endpointCard, { backgroundColor: colors.surfaceVariant }]}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              FROM
            </Text>
            <Pressable
              onPress={() => {
                setEditingFrom((current) => !current);
                setEditingTo(false);
              }}
              testID="navigation-edit-from"
            >
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                {fromPoint ? markerLabel(fromPoint) : "…"}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.primary }}>
                {editingFrom ? "Cancel edit" : "Tap to change start"}
              </Text>
            </Pressable>
            {editingFrom ? (
              <>
                <Searchbar
                  placeholder="Search start marker"
                  value={fromSearch}
                  onChangeText={setFromSearch}
                  style={styles.searchbar}
                  testID="navigation-from-search"
                />
                {fromSearch.trim().length > 0 ? (
                  <View style={styles.searchResults}>
                    {fromSearchResults.map((point) => (
                      <Pressable
                        key={point.id}
                        onPress={() => {
                          if (point.id === toPoint?.id) {
                            return;
                          }
                          onChangeFrom(point.id);
                          setFromSearch("");
                          setEditingFrom(false);
                        }}
                        style={styles.searchResultRow}
                        testID={`navigation-from-result-${point.id}`}
                      >
                        <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                          {markerLabel(point)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
            <Text
              variant="labelMedium"
              style={{ color: colors.onSurfaceVariant, marginTop: Spacing.two }}
            >
              TO
            </Text>
            <Pressable
              onPress={() => {
                setEditingTo((current) => !current);
                setEditingFrom(false);
              }}
              testID="navigation-edit-to"
            >
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                {toPoint ? markerLabel(toPoint) : "…"}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.primary }}>
                {editingTo ? "Cancel edit" : "Tap to change end"}
              </Text>
            </Pressable>
            {editingTo ? (
              <>
                <Searchbar
                  placeholder="Search destination marker"
                  value={toSearch}
                  onChangeText={setToSearch}
                  style={styles.searchbar}
                  testID="navigation-to-search"
                />
                {toSearch.trim().length > 0 ? (
                  <View style={styles.searchResults}>
                    {toSearchResults.map((point) => (
                      <Pressable
                        key={point.id}
                        onPress={() => {
                          if (point.id === fromPoint?.id) {
                            return;
                          }
                          onChangeTo(point.id);
                          setToSearch("");
                          setEditingTo(false);
                        }}
                        style={styles.searchResultRow}
                        testID={`navigation-to-result-${point.id}`}
                      >
                        <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                          {markerLabel(point)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text variant="labelLarge" style={{ color: colors.onSurface }}>
              Navigate via
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Search below, or long-press a marker on the map and choose Route through here.
            </Text>
            <Searchbar
              placeholder="Add a via stop"
              value={viaSearch}
              onChangeText={setViaSearch}
              style={styles.searchbar}
            />
            <ClearSearchFiltersButton
              visible={hasActiveViaFilters}
              onPress={clearViaFilters}
              testID="navigation-via-clear-all"
            />
            {viaSearch.trim().length > 0 ? (
              <View style={styles.searchResults}>
                {viaSearchResults.map((point) => (
                  <Pressable
                    key={point.id}
                    onPress={() => {
                      onAddVia(point.id);
                      setViaSearch("");
                    }}
                    style={styles.searchResultRow}
                  >
                    <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                      {markerLabel(point)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {viaPoints.length > 0 ? (
              <View style={styles.chipRow}>
                {viaPoints.map((point) => (
                  <Chip key={point.id} onClose={() => onRemoveVia(point.id)}>
                    {markerLabel(point)}
                  </Chip>
                ))}
              </View>
            ) : null}
          </View>

          {previewNodes.length > 0 ? (
            <View style={styles.section}>
              <Text variant="labelLarge" style={{ color: colors.onSurface }}>
                Route preview
              </Text>
              {previewNodes.map((point, index) => {
                const active = highlightedPointId === point.id;
                return (
                  <Pressable
                    key={point.id}
                    onPress={() => onHighlightPoint(point.id)}
                    style={[
                      styles.nodeRow,
                      {
                        backgroundColor: active ? colors.primaryContainer : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                      {index + 1}
                    </Text>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface, flex: 1 }}>
                      {markerLabel(point)}
                    </Text>
                  </Pressable>
                );
              })}
              {routePointIds.length > ROUTE_PREVIEW_NODE_LIMIT ? (
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  +{routePointIds.length - ROUTE_PREVIEW_NODE_LIMIT} more markers on this route
                </Text>
              ) : null}
            </View>
          ) : null}

          {upcomingMarkers.length >= 2 ? (
            <RouteElevationChart
              markers={upcomingMarkers}
              routePointIds={routePointIds}
              pointsById={pointsById}
              userLatitude={userLatitude}
              userLongitude={userLongitude}
              userAltitude={userAltitude}
            />
          ) : null}

          {routeAlternatives.length > 0 ? (
            <View style={styles.section}>
              <Text variant="labelLarge" style={{ color: colors.onSurface }}>
                Route options
              </Text>
              {routeAlternatives.map((route, index) => {
                const key = route.pointIds.join(",");
                const selected = key === activeRouteKey;
                const firstHop = route.pointIds[1];
                const firstHopPoint = firstHop ? pointsById.get(firstHop) : null;
                const firstHopLabel = firstHopPoint ? markerLabel(firstHopPoint) : "";
                return (
                  <Pressable
                    key={key}
                    onPress={() => onSelectRoute(route.pointIds, route.distanceMeters)}
                    style={[
                      styles.routeOption,
                      {
                        borderColor: selected ? colors.primary : colors.outlineVariant,
                        backgroundColor: selected ? colors.primaryContainer : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      variant="titleSmall"
                      style={{ color: colors.onSurface, fontWeight: "700" }}
                    >
                      Route {index + 1}
                      {firstHopLabel ? ` · via ${firstHopLabel}` : ""}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {formatRouteDistance(route.distanceMeters)} · {route.pointIds.length} markers
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Button mode="outlined" onPress={onClearRoute}>
            End navigation
          </Button>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetHost: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    pointerEvents: "box-none",
  },
  content: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  title: {
    fontWeight: "800",
  },
  computingRow: {
    paddingVertical: Spacing.one,
    alignItems: "flex-start",
  },
  endpointCard: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  searchbar: {
    borderRadius: 12,
  },
  searchResults: {
    gap: Spacing.one,
  },
  searchResultRow: {
    paddingVertical: Spacing.two,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  routeOption: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
