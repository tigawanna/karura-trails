import React, { useMemo } from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";

const USER_LOCATION_RED = "#EA4335";

interface UserLocationLayerProps {
  longitude: number;
  latitude: number;
  heading?: number | null;
}

export function UserLocationLayer({ longitude, latitude, heading = null }: UserLocationLayerProps) {
  const hasHeading = heading != null && Number.isFinite(heading);

  const pointData: GeoJSON.Feature = useMemo(
    () => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        heading: heading ?? 0,
        hasHeading,
      },
    }),
    [hasHeading, heading, latitude, longitude],
  );

  return (
    <>
      <GeoJSONSource id="user-location-pulse" data={pointData}>
        <Layer
          type="circle"
          id="user-location-pulse-circle"
          paint={{
            "circle-radius": 18,
            "circle-color": USER_LOCATION_RED,
            "circle-opacity": 0.15,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="user-location-heading" data={pointData}>
        <Layer
          type="symbol"
          id="user-location-arrow"
          layout={{
            "text-field": "▲",
            "text-size": 28,
            "text-rotate": hasHeading ? ["get", "heading"] : 0,
            "text-rotation-alignment": "map",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-offset": [0, 0],
          }}
          paint={{
            "text-color": USER_LOCATION_RED,
            "text-halo-color": "#ffffff",
            "text-halo-width": 2.5,
          }}
        />
      </GeoJSONSource>
    </>
  );
}
