import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingIndicator } from "@/components/ui/loading-state";
import { formatMarkerCategoryLabels, readMarkerCategories } from "@/geo/marker-categories";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel, haversineDistanceMeters, pointCoordinates } from "@/geo/nearest-marker";
import { Spacing } from "@/theme";

interface MarkerDetailSheetProps {
  marker: EnrichedRoutingPoint | null;
  distanceMeters: number | null;
  isLoading: boolean;
  locationError: string | null;
  nearKarura: boolean;
  lastKnownLatitude?: number | null;
  lastKnownLongitude?: number | null;
  routeIncludesMarker?: boolean;
  routeSummary?: {
    distanceLabel: string;
    stopCount: number;
    viaCount?: number;
    blockedCount?: number;
  } | null;
  initialSnapIndex?: number;
  dismissible?: boolean;
  overlay?: boolean;
  userSelected?: boolean;
  onDismiss?: () => void;
  onNavigateTo?: () => void;
  onSetLocationHere?: () => void;
  onClearRoute?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  editLabel?: string;
  deletable?: boolean;
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

function supplementaryFeatureLabels(marker: EnrichedRoutingPoint): string[] {
  const selectedCategories = readMarkerCategories(marker).map((entry) =>
    entry.replaceAll("_", " ").toLowerCase(),
  );

  return marker.featureLabels
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((label) => {
      const lower = label.toLowerCase();
      return !selectedCategories.some(
        (category) => lower === category || lower === `trail ${category}`,
      );
    });
}

export function MarkerDetailSheet({
  marker,
  distanceMeters,
  isLoading,
  locationError,
  nearKarura,
  lastKnownLatitude = null,
  lastKnownLongitude = null,
  routeIncludesMarker = false,
  routeSummary = null,
  initialSnapIndex = 1,
  dismissible = false,
  overlay = false,
  userSelected = false,
  onDismiss,
  onNavigateTo,
  onSetLocationHere,
  onClearRoute,
  onDelete,
  onEdit,
  editLabel = "Suggest fix",
  deletable = false,
}: MarkerDetailSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["12%", "46%"], []);

  useEffect(() => {
    if (marker) {
      sheetRef.current?.snapToIndex(initialSnapIndex);
    }
  }, [marker?.id, initialSnapIndex]);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    [],
  );

  const label = marker ? markerLabel(marker) : null;
  const coordinates = marker ? pointCoordinates(marker) : null;
  const categoryLabels = marker ? formatMarkerCategoryLabels(readMarkerCategories(marker)) : "";

  const extraFeatureLabels = marker ? supplementaryFeatureLabels(marker) : [];

  const locationUnavailable = Boolean(locationError) && !nearKarura;

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
            <LoadingIndicator size="large" />
          </View>
        </BottomSheet>
      </View>
    );
  }

  return (
    <View
      testID="marker-detail-sheet"
      style={[styles.sheetHost, overlay ? styles.overlayHost : null]}
    >
      <BottomSheet
        ref={sheetRef}
        index={marker ? initialSnapIndex : 0}
        snapPoints={snapPoints}
        enablePanDownToClose={dismissible}
        backdropComponent={dismissible ? renderBackdrop : undefined}
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
          {!marker ? (
            <Text variant="titleMedium" style={{ color: colors.onSurface }}>
              Tap a marker on the map
            </Text>
          ) : (
            <>
              <View style={styles.hero}>
                <View style={styles.heroHeader}>
                  <Text
                    variant="labelMedium"
                    style={[styles.eyebrow, { color: colors.primary, flex: 1 }]}
                  >
                    {formatKindLabel(marker.markerKind)}
                    {categoryLabels ? ` · ${categoryLabels}` : ""}
                    {extraFeatureLabels.length > 0 ? ` · ${extraFeatureLabels.join(" · ")}` : ""}
                  </Text>
                  {dismissible ? (
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={onDismiss}
                      style={styles.closeButton}
                      testID="marker-detail-sheet-close"
                    />
                  ) : null}
                </View>

                <View style={styles.titleRow}>
                  <Text
                    variant="headlineMedium"
                    style={[styles.title, { color: colors.onSurface, flex: 1 }]}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                  {locationUnavailable ? (
                    <MaterialCommunityIcons
                      name="crosshairs-off"
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  ) : distanceMeters != null && nearKarura ? (
                    <View
                      style={[styles.distanceBadge, { backgroundColor: colors.primaryContainer }]}
                    >
                      <Text
                        variant="labelMedium"
                        style={{ color: colors.onPrimaryContainer, fontWeight: "700" }}
                      >
                        {!userSelected && distanceMeters <= 40
                          ? "You are here"
                          : `${formatDistance(distanceMeters)} away`}
                      </Text>
                    </View>
                  ) : !nearKarura ? (
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      Off map
                    </Text>
                  ) : null}
                </View>

                {locationUnavailable ? (
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {lastKnownLatitude != null && lastKnownLongitude != null
                      ? `${lastKnownLatitude.toFixed(5)}, ${lastKnownLongitude.toFixed(5)}`
                      : "Location unavailable"}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.metaCard, { backgroundColor: colors.surfaceVariant }]}>
                {marker.elevation != null ? (
                  <View style={styles.metaCell}>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      Elevation
                    </Text>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: "600" }}>
                      {Math.round(marker.elevation)} m
                    </Text>
                  </View>
                ) : null}
                {coordinates ? (
                  <View style={styles.metaCell}>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      Coordinates
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.onSurface, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                    </Text>
                  </View>
                ) : null}
                {marker.nodeRole ? (
                  <View style={styles.metaCell}>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      Role
                    </Text>
                    <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: "600" }}>
                      {marker.nodeRole}
                    </Text>
                  </View>
                ) : null}
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
                  <Text variant="labelMedium" style={{ color: colors.onSurface, fontWeight: "700" }}>
                    Route active · {routeSummary.distanceLabel} · {routeSummary.stopCount} stops
                    {routeSummary.viaCount ? ` · ${routeSummary.viaCount} via` : ""}
                    {routeSummary.blockedCount ? ` · ${routeSummary.blockedCount} avoided` : ""}
                  </Text>
                </View>
              ) : null}

              {onSetLocationHere || onNavigateTo ? (
                <View style={styles.actionRow}>
                  {onSetLocationHere ? (
                    <Button
                      mode="contained-tonal"
                      icon="crosshairs-gps"
                      onPress={onSetLocationHere}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                    >
                      I am here
                    </Button>
                  ) : null}
                  {onNavigateTo ? (
                    <Button
                      mode="contained"
                      icon="navigation"
                      onPress={onNavigateTo}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                    >
                      Navigate
                    </Button>
                  ) : null}
                </View>
              ) : null}

              {onEdit || (routeIncludesMarker && onClearRoute) || (deletable && onDelete) ? (
                <View style={styles.actionRow}>
                  {onEdit ? (
                    <Button
                      mode="outlined"
                      icon="pencil-outline"
                      onPress={onEdit}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                      testID="marker-detail-edit"
                    >
                      {editLabel}
                    </Button>
                  ) : null}
                  {routeIncludesMarker && onClearRoute ? (
                    <Button
                      mode="outlined"
                      onPress={onClearRoute}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                    >
                      Clear route
                    </Button>
                  ) : null}
                  {deletable && onDelete ? (
                    <Button
                      mode="outlined"
                      icon="delete-outline"
                      textColor={colors.error}
                      onPress={onDelete}
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                      testID="marker-detail-delete"
                    >
                      Delete
                    </Button>
                  ) : null}
                </View>
              ) : null}
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
  overlayHost: {
    zIndex: 40,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    gap: Spacing.three,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  closeButton: {
    margin: 0,
    marginTop: -Spacing.two,
    marginRight: -Spacing.two,
  },
  hero: {
    gap: Spacing.one,
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
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    flexShrink: 0,
  },
  metaCard: {
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  metaCell: {
    flexGrow: 1,
    flexBasis: "45%",
    gap: 2,
  },
  descriptionBlock: {
    gap: Spacing.one,
  },
  routeBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    height: 44,
  },
  loadingContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.four,
  },
});
