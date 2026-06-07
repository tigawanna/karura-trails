import { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";

import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { pointCoordinates } from "@/geo/nearest-marker";

interface RoutePreviewLayerProps {
  routePointIds: number[];
  pointsById: Map<number, EnrichedRoutingPoint>;
}

export function RoutePreviewLayer({ routePointIds, pointsById }: RoutePreviewLayerProps) {
  const featureCollection = useMemo((): GeoJSON.FeatureCollection => {
    const coordinates = routePointIds
      .map((pointId) => {
        const point = pointsById.get(pointId);
        if (!point) {
          return null;
        }
        const position = pointCoordinates(point);
        if (!position) {
          return null;
        }
        return [position.longitude, position.latitude] as GeoJSON.Position;
      })
      .filter((value): value is GeoJSON.Position => value != null);

    if (coordinates.length < 2) {
      return { type: "FeatureCollection", features: [] };
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      ],
    };
  }, [pointsById, routePointIds]);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <GeoJSONSource id="route-preview-source" data={featureCollection}>
      <Layer
        type="line"
        id="route-preview-casing"
        paint={{
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.85,
        }}
      />
      <Layer
        type="line"
        id="route-preview-line"
        paint={{
          "line-color": "#2563eb",
          "line-width": 5,
        }}
      />
    </GeoJSONSource>
  );
}
