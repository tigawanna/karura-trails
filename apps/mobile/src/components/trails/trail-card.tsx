import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import {
  formatDifficultyLabel,
  formatSurfaceLabel,
  formatTrailDistance,
  formatTrailElevation,
} from "@/lib/format-trail-stats";
import type { PathSelect, TrailDifficulty } from "@/lib/drizzle/schema";
import { MaxContentWidth, Spacing, useTheme as useAppTheme } from "@/theme";

export type TrailCardProps = {
  trail: PathSelect;
  testID?: string;
};

const difficultyTone: Record<TrailDifficulty, "primary" | "tertiary" | "secondary" | "error"> = {
  easy: "primary",
  moderate: "tertiary",
  hard: "secondary",
  expert: "error",
};

function isTrailDifficulty(value: string | null | undefined): value is TrailDifficulty {
  return value === "easy" || value === "moderate" || value === "hard" || value === "expert";
}

function StatBlock({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.statBlock}>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleSmall" style={{ color: valueColor, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

export function TrailCard({ trail, testID }: TrailCardProps) {
  const { colors } = useTheme();
  const appTheme = useAppTheme();
  const difficulty = isTrailDifficulty(trail.difficulty) ? trail.difficulty : null;
  const tone = difficulty ? difficultyTone[difficulty] : "tertiary";
  const badgeBackground =
    tone === "primary"
      ? colors.primaryContainer
      : tone === "tertiary"
        ? colors.tertiaryContainer
        : tone === "secondary"
          ? colors.secondaryContainer
          : colors.errorContainer;
  const badgeForeground =
    tone === "primary"
      ? colors.onPrimaryContainer
      : tone === "tertiary"
        ? colors.onTertiaryContainer
        : tone === "secondary"
          ? colors.onSecondaryContainer
          : colors.onErrorContainer;

  const elevationRange =
    trail.minElevation != null && trail.maxElevation != null
      ? `${formatTrailElevation(trail.minElevation)} – ${formatTrailElevation(trail.maxElevation)}`
      : "—";

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.elevation.level1,
          elevation: 4,
          maxWidth: MaxContentWidth,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          variant="titleMedium"
          style={[styles.title, { color: colors.onSurface }]}
          numberOfLines={2}
        >
          {trail.name}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
          <Text variant="labelSmall" style={{ color: badgeForeground, fontWeight: "600" }}>
            {formatDifficultyLabel(trail.difficulty)}
          </Text>
        </View>
      </View>

      {trail.description ? (
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }} numberOfLines={3}>
          {trail.description}
        </Text>
      ) : null}

      <View style={styles.statsRow}>
        <StatBlock
          label="Distance"
          value={formatTrailDistance(trail.distanceMeters)}
          valueColor={colors.onSurface}
        />
        <StatBlock
          label="Elevation gain"
          value={formatTrailElevation(trail.elevationGain)}
          valueColor={colors.onSurface}
        />
        <StatBlock label="Elevation" value={elevationRange} valueColor={colors.onSurface} />
      </View>

      <View style={styles.footerRow}>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {formatSurfaceLabel(trail.surfaceType)}
          {trail.isLoop ? " · Loop" : ""}
          {trail.vertexCount != null ? ` · ${trail.vertexCount.toLocaleString()} points` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontWeight: "600",
  },
  badge: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  statBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
