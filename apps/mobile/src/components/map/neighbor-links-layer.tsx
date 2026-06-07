import React, { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";

import type { NeighborLinkWithGeometry } from "@/data-access-layer/routing-graph";
import { geomParse, isValidLineString } from "@/geo/geom-parse";

interface NeighborLinksLayerProps {
  links: NeighborLinkWithGeometry[];
}

export function NeighborLinksLayer({ links }: NeighborLinksLayerProps) {
  const featureCollection = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = links
      .map((link) => {
        const parsed = geomParse(link.geom);
        if (!isValidLineString(parsed)) {
          return null;
        }

        return {
          type: "Feature" as const,
          geometry: parsed as GeoJSON.Geometry,
          properties: {
            id: link.id,
            fromRef: link.fromRef,
            toRef: link.toRef,
          },
        };
      })
      .filter((feature): feature is NonNullable<typeof feature> => feature != null);

    return { type: "FeatureCollection", features };
  }, [links]);

  if (featureCollection.features.length === 0) {
    return null;
  }

  return (
    <GeoJSONSource id="neighbor-links-source" data={featureCollection}>
      <Layer
        type="line"
        id="neighbor-links-casing"
        paint={{
          "line-color": "rgba(0,0,0,0.15)",
          "line-width": 4,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
      <Layer
        type="line"
        id="neighbor-links-line"
        paint={{
          "line-color": "#6366f1",
          "line-width": 2.5,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
    </GeoJSONSource>
  );
}
