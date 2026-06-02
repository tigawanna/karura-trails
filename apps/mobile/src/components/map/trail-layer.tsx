import React, { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { useTheme } from "react-native-paper";

import { geomParse, isValidLineString } from "@/lib/map-libre/geom-parse";
import type { TrailWithGeometry } from "@/types/trail";

interface TrailLayerProps {
  trails: TrailWithGeometry[];
}

export function TrailLayer({ trails }: TrailLayerProps) {
  const { colors } = useTheme();

  const featureCollection = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = trails
      .map((trail) => {
        const parsed = geomParse(trail.geom);
        if (!isValidLineString(parsed)) return null;

        return {
          type: "Feature" as const,
          geometry: parsed as GeoJSON.Geometry,
          properties: {
            id: trail.id,
            name: trail.name,
            slug: trail.slug,
            difficulty: trail.difficulty ?? "moderate",
            distance: trail.distanceMeters ?? 0,
            elevationGain: trail.elevationGain ?? 0,
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return { type: "FeatureCollection", features };
  }, [trails]);

  if (featureCollection.features.length === 0) return null;

  return (
    <GeoJSONSource id="trails-source" data={featureCollection}>
      <Layer
        type="line"
        id="trails-line-casing"
        paint={{
          "line-color": "rgba(0,0,0,0.2)",
          "line-width": 5,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
      <Layer
        type="line"
        id="trails-line"
        paint={{
          "line-color": [
            "match",
            ["get", "difficulty"],
            "easy",
            "#4CAF50",
            "moderate",
            "#FF9800",
            "hard",
            "#F44336",
            "expert",
            "#9C27B0",
            colors.primary,
          ],
          "line-width": 3,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
      <Layer
        type="symbol"
        id="trails-labels"
        paint={{
          "text-color": colors.onBackground,
          "text-halo-color": colors.background,
          "text-halo-width": 1.5,
        }}
        layout={{
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "symbol-placement": "line",
          "text-allow-overlap": false,
        }}
      />
    </GeoJSONSource>
  );
}
