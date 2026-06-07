import React, { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { useTheme } from "react-native-paper";

import type { PointWithGeometry } from "@/data-access-layer/points";
import { geomParse, isValidPoint } from "@/geo/geom-parse";

interface RoutingPointsLayerProps {
  points: PointWithGeometry[];
}

export function RoutingPointsLayer({ points }: RoutingPointsLayerProps) {
  const { colors } = useTheme();

  const featureCollection = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = points
      .map((point) => {
        const geometry = geomParse(point.geom);
        if (!isValidPoint(geometry)) {
          return null;
        }

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: geometry.coordinates as GeoJSON.Position,
          },
          properties: {
            id: point.id,
            ref: point.ref ?? "",
            name: point.name ?? point.ref ?? "Marker",
            category: point.category ?? "custom",
            nodeRole: point.nodeRole ?? "",
          },
        };
      })
      .filter((feature): feature is NonNullable<typeof feature> => feature != null);

    return { type: "FeatureCollection", features };
  }, [points]);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <GeoJSONSource id="routing-points-source" data={featureCollection}>
      <Layer
        type="circle"
        id="routing-points-dot"
        paint={{
          "circle-radius": ["match", ["get", "category"], "junction", 6, "gate", 6, 5],
          "circle-color": [
            "match",
            ["get", "nodeRole"],
            "endpoint",
            "#14b8a6",
            [
              "match",
              ["get", "category"],
              "junction",
              "#f59e0b",
              "gate",
              "#8b5cf6",
              colors.primary,
            ],
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": colors.surface,
        }}
      />
      <Layer
        type="symbol"
        id="routing-points-labels"
        paint={{
          "text-color": colors.onBackground,
          "text-halo-color": colors.background,
          "text-halo-width": 1.5,
        }}
        layout={{
          "text-field": ["coalesce", ["get", "ref"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
        }}
      />
    </GeoJSONSource>
  );
}
