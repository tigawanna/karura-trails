import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrailElevationWindowChart } from "@/components/trails/trail-elevation-window-chart";
import type { TrailOnTrackMatch } from "@/geo/trail-tracking";
import { formatDistanceToTrail } from "@/geo/trail-tracking";
import { Spacing } from "@/theme";

interface TrailOnTrackSheetProps {
  match: TrailOnTrackMatch | null;
  isLoading: boolean;
  locationError: string | null;
}

const ON_TRAIL_THRESHOLD_METERS = 80;

export function TrailOnTrackSheet({ match, isLoading, locationError }: TrailOnTrackSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["10%", "42%", "88%"], []);

  const onTrail = match != null && match.distanceToTrailMeters <= ON_TRAIL_THRESHOLD_METERS;

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
            ) : locationError ? (
              <Text variant="bodyMedium" style={{ color: colors.error }}>
                {locationError}
              </Text>
            ) : !match ? (
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                No trail nearby
              </Text>
            ) : (
              <View style={styles.peekMain}>
                <Text variant="titleMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                  {match.trail.name}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {onTrail
                    ? match.closestVertexLabel
                    : formatDistanceToTrail(match.distanceToTrailMeters)}
                </Text>
              </View>
            )}

            {match?.elevationTrend ? (
              <View style={styles.elevationBadge}>
                <Text variant="labelLarge" style={{ color: colors.primary }}>
                  {match.elevationTrend.summary}
                </Text>
              </View>
            ) : null}
          </View>

          {onTrail && match?.elevationWindow ? (
            <TrailElevationWindowChart elevationWindow={match.elevationWindow} />
          ) : null}

          {match && !isLoading && !locationError ? (
            <View style={styles.details}>
              {match.elevationTrend ? (
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                  {match.elevationTrend.detail}
                </Text>
              ) : null}

              {match.guidanceHint ? (
                <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                  {match.guidanceHint}
                </Text>
              ) : (
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  Gate-to-gate turn guidance and forest markers are coming soon.
                </Text>
              )}
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
  elevationBadge: {
    alignItems: "flex-end",
  },
  details: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
