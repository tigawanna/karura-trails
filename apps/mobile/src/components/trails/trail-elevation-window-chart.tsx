import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Svg, { Circle, Line, Path } from "react-native-svg";

import type { ElevationWindow } from "@/geo/trail-tracking";
import { Spacing } from "@/theme";

interface TrailElevationWindowChartProps {
  elevationWindow: ElevationWindow;
  height?: number;
}

interface PlotPoint {
  x: number;
  y: number;
  role: ElevationWindow["points"][number]["role"];
}

const CHART_HEIGHT = 88;
const PADDING = { top: 10, right: 12, bottom: 20, left: 12 };

function formatOffsetMeters(offsetMeters: number): string {
  const abs = Math.abs(offsetMeters);
  if (abs < 1000) {
    return `${Math.round(offsetMeters)}m`;
  }
  return `${(offsetMeters / 1000).toFixed(1)}km`;
}

function buildPlotPoints(
  elevationWindow: ElevationWindow,
  width: number,
  height: number,
): PlotPoint[] {
  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);
  const { points, minElevation, maxElevation } = elevationWindow;
  const offsets = points.map((point) => point.offsetFromCurrentMeters);
  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const offsetSpan = maxOffset - minOffset;
  const elevationSpan = maxElevation - minElevation;

  return points.map((point, index) => {
    const xRatio =
      offsetSpan > 0
        ? (point.offsetFromCurrentMeters - minOffset) / offsetSpan
        : points.length > 1
          ? index / (points.length - 1)
          : 0.5;
    const yRatio = elevationSpan > 0 ? (point.elevation - minElevation) / elevationSpan : 0.5;

    return {
      x: PADDING.left + xRatio * plotWidth,
      y: PADDING.top + (1 - yRatio) * plotHeight,
      role: point.role,
    };
  });
}

export function TrailElevationWindowChart({
  elevationWindow,
  height = CHART_HEIGHT,
}: TrailElevationWindowChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const plotPoints = useMemo(
    () => (width > 0 ? buildPlotPoints(elevationWindow, width, height) : []),
    [elevationWindow, width, height],
  );

  const linePath = useMemo(() => {
    if (plotPoints.length === 0) {
      return "";
    }
    return plotPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }, [plotPoints]);

  const areaPath = useMemo(() => {
    if (plotPoints.length === 0) {
      return "";
    }
    const baselineY = height - PADDING.bottom;
    const first = plotPoints[0];
    const last = plotPoints[plotPoints.length - 1];
    return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }, [linePath, plotPoints, height]);

  const currentPoint = plotPoints.find((point) => point.role === "current");
  const firstOffset = elevationWindow.points[0]?.offsetFromCurrentMeters ?? 0;
  const lastOffset =
    elevationWindow.points[elevationWindow.points.length - 1]?.offsetFromCurrentMeters ?? 0;
  const currentElevation =
    elevationWindow.points.find((point) => point.role === "current")?.elevation ??
    elevationWindow.points[Math.floor(elevationWindow.points.length / 2)]?.elevation;

  return (
    <View
      testID="trail-elevation-window-chart"
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth !== width) {
          setWidth(nextWidth);
        }
      }}
    >
      {width > 0 && plotPoints.length >= 2 ? (
        <Svg width={width} height={height}>
          <Path d={areaPath} fill={colors.primary} opacity={0.2} />
          <Path
            d={linePath}
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Line
            x1={PADDING.left}
            y1={height - PADDING.bottom}
            x2={width - PADDING.right}
            y2={height - PADDING.bottom}
            stroke={colors.outlineVariant}
            strokeWidth={1}
          />
          {currentPoint ? (
            <>
              <Line
                x1={currentPoint.x}
                y1={PADDING.top}
                x2={currentPoint.x}
                y2={height - PADDING.bottom}
                stroke={colors.secondary}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <Circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r={5}
                fill={colors.secondary}
                stroke={colors.surface}
                strokeWidth={2}
              />
            </>
          ) : null}
        </Svg>
      ) : null}

      <View style={styles.axisRow}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
          {formatOffsetMeters(firstOffset)}
        </Text>
        <Text variant="labelSmall" style={{ color: colors.onSurface }}>
          {currentElevation != null ? `${Math.round(currentElevation)} m` : "—"}
        </Text>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
          {formatOffsetMeters(lastOffset)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: Spacing.half,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.one,
  },
});
