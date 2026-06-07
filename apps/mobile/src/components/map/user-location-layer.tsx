import React, { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { useTheme } from "react-native-paper";

interface UserLocationLayerProps {
  longitude: number;
  latitude: number;
  heading?: number | null;
}

export function UserLocationLayer({ longitude, latitude, heading = null }: UserLocationLayerProps) {
  const { colors } = useTheme();

  const pointData: GeoJSON.Feature = useMemo(
    () => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        heading: heading ?? 0,
        hasHeading: heading != null && Number.isFinite(heading),
      },
    }),
    [heading, latitude, longitude],
  );

  return (
    <>
      <GeoJSONSource id="user-location-pulse" data={pointData}>
        <Layer
          type="circle"
          id="user-location-pulse-circle"
          paint={{
            "circle-radius": 22,
            "circle-color": colors.primary,
            "circle-opacity": 0.12,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="user-location-heading" data={pointData}>
        <Layer
          type="symbol"
          id="user-location-arrow"
          filter={["==", ["get", "hasHeading"], true]}
          layout={{
            "text-field": "▲",
            "text-size": 34,
            "text-rotate": ["get", "heading"],
            "text-rotation-alignment": "map",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-offset": [0, -0.15],
          }}
          paint={{
            "text-color": colors.primary,
            "text-halo-color": "#ffffff",
            "text-halo-width": 3,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="user-location-dot" data={pointData}>
        <Layer
          type="circle"
          id="user-location-outer"
          paint={{
            "circle-radius": 11,
            "circle-color": "#FFFFFF",
            "circle-stroke-width": 2,
            "circle-stroke-color": colors.primary,
          }}
        />
        <Layer
          type="circle"
          id="user-location-inner"
          paint={{
            "circle-radius": 7,
            "circle-color": colors.primary,
          }}
        />
      </GeoJSONSource>
    </>
  );
}
