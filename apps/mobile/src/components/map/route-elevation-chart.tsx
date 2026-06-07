import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { Text, useTheme } from "react-native-paper";

import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel, pointCoordinates } from "@/geo/nearest-marker";
import { Spacing } from "@/theme";

const CHART_HEIGHT = 120;
const CHART_PADDING = { top: 12, right: 8, bottom: 28, left: 36 };

interface RouteElevationChartProps {
  markers: EnrichedRoutingPoint[];
}

export function getUpcomingRouteMarkers(
  routePointIds: number[],
  pointsById: Map<number, EnrichedRoutingPoint>,
  userLatitude: number | null,
  userLongitude: number | null,
  limit = 10,
): EnrichedRoutingPoint[] {
  if (routePointIds.length === 0) {
    return [];
  }

  let startIndex = 0;
  if (userLatitude != null && userLongitude != null) {
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < routePointIds.length; index += 1) {
      const point = pointsById.get(routePointIds[index]);
      const coordinates = point ? pointCoordinates(point) : null;
      if (!coordinates) {
        continue;
      }
      const dLat = ((coordinates.latitude - userLatitude) * Math.PI) / 180;
      const dLng = ((coordinates.longitude - userLongitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userLatitude * Math.PI) / 180) *
          Math.cos((coordinates.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distance < closestDistance) {
        closestDistance = distance;
        startIndex = index;
      }
    }
  }

  return routePointIds
    .slice(startIndex, startIndex + limit)
    .map((id) => pointsById.get(id))
    .filter((point): point is EnrichedRoutingPoint => point != null);
}

export function RouteElevationChart({ markers }: RouteElevationChartProps) {
  const { colors } = useTheme();

  const chartData = useMemo(() => {
    const withElevation = markers.filter((marker) => marker.elevation != null);
    if (withElevation.length < 2) {
      return null;
    }

    const elevations = withElevation.map((marker) => marker.elevation as number);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const range = Math.max(maxElevation - minElevation, 1);

    return {
      points: withElevation,
      minElevation,
      maxElevation,
      range,
    };
  }, [markers]);

  if (!chartData) {
    return null;
  }

  const chartWidth = 320;
  const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const coordinates = chartData.points.map((marker, index) => {
    const x = CHART_PADDING.left + (index / Math.max(chartData.points.length - 1, 1)) * plotWidth;
    const elevation = marker.elevation as number;
    const y =
      CHART_PADDING.top +
      plotHeight -
      ((elevation - chartData.minElevation) / chartData.range) * plotHeight;
    return { x, y, marker, elevation };
  });

  const polylinePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <View style={styles.container} testID="route-elevation-chart">
      <Text variant="labelLarge" style={{ color: colors.onSurface }}>
        Upcoming elevation
      </Text>
      <View style={[styles.chartFrame, { backgroundColor: colors.surfaceVariant }]}>
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}>
          <Line
            x1={CHART_PADDING.left}
            y1={CHART_PADDING.top + plotHeight}
            x2={CHART_PADDING.left + plotWidth}
            y2={CHART_PADDING.top + plotHeight}
            stroke={colors.outlineVariant}
            strokeWidth={1}
          />
          <SvgText x={4} y={CHART_PADDING.top + 4} fill={colors.onSurfaceVariant} fontSize={10}>
            {Math.round(chartData.maxElevation)}m
          </SvgText>
          <SvgText
            x={4}
            y={CHART_PADDING.top + plotHeight}
            fill={colors.onSurfaceVariant}
            fontSize={10}
          >
            {Math.round(chartData.minElevation)}m
          </SvgText>
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coordinates.map(({ x, y, marker }) => (
            <Circle
              key={marker.id}
              cx={x}
              cy={y}
              r={4}
              fill={colors.primary}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </View>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={2}>
        {coordinates.map(({ marker }) => markerLabel(marker)).join(" → ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  chartFrame: {
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: Spacing.two,
  },
});
