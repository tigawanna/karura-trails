import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MarkerProximityMatch } from "@/hooks/use-trail-on-track";
import { markerLabel } from "@/geo/nearest-marker";
import { Spacing } from "@/theme";

interface TrailOnTrackSheetProps {
  match: MarkerProximityMatch | null;
  isLoading: boolean;
  locationError: string | null;
  lastKnownLatitude?: number | null;
  lastKnownLongitude?: number | null;
}

const ON_MARKER_THRESHOLD_METERS = 40;

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function TrailOnTrackSheet({
  match,
  isLoading,
  locationError,
  lastKnownLatitude = null,
  lastKnownLongitude = null,
}: TrailOnTrackSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["10%", "28%"], []);

  const atMarker = match != null && match.distanceMeters <= ON_MARKER_THRESHOLD_METERS;
  const label = match ? markerLabel(match.marker) : null;
  const locationUnavailable = Boolean(locationError);

  return (
    <View testID="trail-on-track-sheet" style={styles.sheetHost}>
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.onSurfaceVariant }}
        bottomInset={insets.bottom}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.peekContent,
            { paddingBottom: insets.bottom + Spacing.four },
          ]}
          testID="trail-on-track-sheet-content"
        >
          <View style={styles.peekRow}>
            {isLoading ? (
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                Locating…
              </Text>
            ) : locationUnavailable ? (
              <View style={styles.peekMain}>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons
                    name="crosshairs-off"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                  <Text variant="titleMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                    {lastKnownLatitude != null && lastKnownLongitude != null
                      ? `${lastKnownLatitude.toFixed(5)}, ${lastKnownLongitude.toFixed(5)}`
                      : "Unknown location"}
                  </Text>
                </View>
                {match ? (
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Nearest: {label}
                  </Text>
                ) : null}
              </View>
            ) : !match ? (
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                No marker nearby
              </Text>
            ) : (
              <View style={styles.peekMain}>
                <Text variant="titleMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                  {label}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {atMarker ? "At marker" : formatDistance(match.distanceMeters)}
                </Text>
              </View>
            )}
          </View>

          {match && !isLoading ? (
            <View style={styles.details}>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {[match.marker.category, match.marker.nodeRole, match.marker.featureLabels]
                  .filter(Boolean)
                  .join(" · ")}
                {match.marker.elevation != null ? ` · ${Math.round(match.marker.elevation)} m` : ""}
              </Text>
              {match.marker.description ? (
                <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                  {match.marker.description}
                </Text>
              ) : null}
            </View>
          ) : null}
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
  peekContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    gap: Spacing.three,
  },
  peekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    minHeight: 48,
  },
  peekMain: {
    flex: 1,
    gap: Spacing.half,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  details: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
