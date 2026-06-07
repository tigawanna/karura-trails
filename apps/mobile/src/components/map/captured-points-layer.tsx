import React, { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { useTheme } from "react-native-paper";

import type { PointWithGeometry } from "@/data-access-layer/points";
import { geomParse, isValidPoint } from "@/geo/geom-parse";

interface CapturedPointsLayerProps {
  points: PointWithGeometry[];
  draftCoordinate?: { lng: number; lat: number } | null;
}

export function CapturedPointsLayer({ points, draftCoordinate }: CapturedPointsLayerProps) {
  const { colors } = useTheme();

  const featureCollection = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = points
      .map((point) => {
        const geometry = geomParse(point.geom);
        if (!isValidPoint(geometry)) {
          return null;
        }

        const coordinates = geometry.coordinates as GeoJSON.Position;

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates,
          },
          properties: {
            id: point.id,
            name: point.name ?? "Marker",
            category: point.category ?? "custom",
          },
        };
      })
      .filter((feature): feature is NonNullable<typeof feature> => feature != null);

    if (draftCoordinate) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [draftCoordinate.lng, draftCoordinate.lat],
        },
        properties: {
          id: "draft",
          name: "Draft",
          category: "draft",
        },
      });
    }

    return { type: "FeatureCollection", features };
  }, [draftCoordinate, points]);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <GeoJSONSource id="captured-points" data={featureCollection}>
      <Layer
        type="circle"
        id="captured-points-halo"
        filter={["==", ["get", "category"], "draft"]}
        paint={{
          "circle-radius": 14,
          "circle-color": colors.secondary,
          "circle-opacity": 0.25,
        }}
      />
      <Layer
        type="circle"
        id="captured-points-draft"
        filter={["==", ["get", "category"], "draft"]}
        paint={{
          "circle-radius": 8,
          "circle-color": colors.secondary,
          "circle-stroke-width": 2,
          "circle-stroke-color": colors.surface,
        }}
      />
      <Layer
        type="circle"
        id="captured-points-dot"
        filter={["!=", ["get", "category"], "draft"]}
        paint={{
          "circle-radius": 7,
          "circle-color": colors.tertiary,
          "circle-stroke-width": 2,
          "circle-stroke-color": colors.surface,
        }}
      />
    </GeoJSONSource>
  );
}
