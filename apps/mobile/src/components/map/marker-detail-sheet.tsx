import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Chip, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel, haversineDistanceMeters, pointCoordinates } from "@/geo/nearest-marker";
import { Spacing } from "@/theme";

interface MarkerDetailSheetProps {
  marker: EnrichedRoutingPoint | null;
  distanceMeters: number | null;
  isLoading: boolean;
  locationError: string | null;
  nearKarura: boolean;
  routeIncludesMarker?: boolean;
  routeSummary?: {
    distanceLabel: string;
    stopCount: number;
    viaCount?: number;
    blockedCount?: number;
  } | null;
  initialSnapIndex?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
  onNavigateTo?: () => void;
  onClearRoute?: () => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatKindLabel(kind: string | null | undefined): string {
  if (!kind) {
    return "Marker";
  }
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function MarkerDetailSheet({
  marker,
  distanceMeters,
  isLoading,
  locationError,
  nearKarura,
  routeIncludesMarker = false,
  routeSummary = null,
  initialSnapIndex = 1,
  dismissible = false,
  onDismiss,
  onNavigateTo,
  onClearRoute,
}: MarkerDetailSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["14%", "52%"], []);

  useEffect(() => {
    if (marker) {
      sheetRef.current?.snapToIndex(initialSnapIndex);
    }
  }, [marker?.id, initialSnapIndex]);

  const label = marker ? markerLabel(marker) : null;
  const coordinates = marker ? pointCoordinates(marker) : null;
  const featureLabels = marker?.featureLabels
    ? marker.featureLabels
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

  if (isLoading && !marker) {
    return (
      <View testID="marker-detail-sheet-loading" style={styles.sheetHost}>
        <BottomSheet
          index={0}
          snapPoints={["12%"]}
          enableHandlePanningGesture={false}
          backgroundStyle={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          handleIndicatorStyle={{ backgroundColor: colors.onSurfaceVariant, width: 44 }}
          bottomInset={insets.bottom}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </BottomSheet>
      </View>
    );
  }

  return (
    <View testID="marker-detail-sheet" style={styles.sheetHost}>
      <BottomSheet
        ref={sheetRef}
        index={marker ? initialSnapIndex : 0}
        snapPoints={snapPoints}
        enablePanDownToClose={dismissible}
        onChange={(index) => {
          if (dismissible && index < 0) {
            onDismiss?.();
          }
        }}
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
          testID="marker-detail-sheet-content"
        >
          {locationError ? (
            <Text variant="bodyMedium" style={{ color: colors.error }}>
              {locationError}
            </Text>
          ) : !marker ? (
            <Text variant="titleMedium" style={{ color: colors.onSurface }}>
              Tap a marker on the map
            </Text>
          ) : (
            <>
              <View style={styles.hero}>
                <Text variant="labelLarge" style={[styles.eyebrow, { color: colors.primary }]}>
                  {formatKindLabel(marker.markerKind)}
                  {marker.category ? ` · ${marker.category.replaceAll("_", " ")}` : ""}
                </Text>
                <Text variant="headlineMedium" style={[styles.title, { color: colors.onSurface }]}>
                  {label}
                </Text>
                {distanceMeters != null && nearKarura ? (
                  <View
                    style={[styles.distanceBadge, { backgroundColor: colors.primaryContainer }]}
                  >
                    <Text
                      variant="labelLarge"
                      style={{ color: colors.onPrimaryContainer, fontWeight: "700" }}
                    >
                      {distanceMeters <= 40
                        ? "You are here"
                        : `${formatDistance(distanceMeters)} away`}
                    </Text>
                  </View>
                ) : !nearKarura ? (
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Outside Karura — showing a default marker
                  </Text>
                ) : null}
              </View>

              {featureLabels.length > 0 ? (
                <View style={styles.chipRow}>
                  {featureLabels.map((featureLabel) => (
                    <Chip key={featureLabel} compact mode="outlined">
                      {featureLabel}
                    </Chip>
                  ))}
                </View>
              ) : null}

              <View style={[styles.metaCard, { backgroundColor: colors.surfaceVariant }]}>
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                  DETAILS
                </Text>
                <Text variant="bodyLarge" style={{ color: colors.onSurface, lineHeight: 24 }}>
                  {[
                    marker.nodeRole ? `Role: ${marker.nodeRole}` : null,
                    marker.elevation != null ? `Elevation ${Math.round(marker.elevation)} m` : null,
                    coordinates
                      ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </Text>
              </View>

              {marker.description ? (
                <View style={styles.descriptionBlock}>
                  <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                    ABOUT
                  </Text>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface, lineHeight: 24 }}>
                    {marker.description}
                  </Text>
                </View>
              ) : null}

              {routeIncludesMarker && routeSummary ? (
                <View style={[styles.routeBanner, { borderColor: colors.primary }]}>
                  <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: "700" }}>
                    Route active
                  </Text>
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                    {routeSummary.distanceLabel} · {routeSummary.stopCount} markers on path
                    {routeSummary.viaCount ? ` · ${routeSummary.viaCount} via` : ""}
                    {routeSummary.blockedCount ? ` · ${routeSummary.blockedCount} avoided` : ""}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                {onNavigateTo ? (
                  <Button mode="contained" icon="navigation" onPress={onNavigateTo}>
                    Navigate here
                  </Button>
                ) : null}
                {routeIncludesMarker && onClearRoute ? (
                  <Button mode="outlined" onPress={onClearRoute}>
                    Clear route
                  </Button>
                ) : null}
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

export function markerDistanceFromLocation(
  marker: EnrichedRoutingPoint,
  latitude: number,
  longitude: number,
): number | null {
  const coordinates = pointCoordinates(marker);
  if (!coordinates) {
    return null;
  }
  return haversineDistanceMeters(latitude, longitude, coordinates.latitude, coordinates.longitude);
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
  hero: {
    gap: Spacing.two,
  },
  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  distanceBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  metaCard: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  descriptionBlock: {
    gap: Spacing.two,
  },
  routeBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
  loadingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.four,
  },
});
