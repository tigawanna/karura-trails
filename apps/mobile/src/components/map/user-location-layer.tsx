import React from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { useTheme } from "react-native-paper";

interface UserLocationLayerProps {
  longitude: number;
  latitude: number;
}

export function UserLocationLayer({ longitude, latitude }: UserLocationLayerProps) {
  const { colors } = useTheme();

  const pointData: GeoJSON.Feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {},
  };

  return (
    <>
      <GeoJSONSource id="user-location-pulse" data={pointData}>
        <Layer
          type="circle"
          id="user-location-pulse-circle"
          paint={{
            "circle-radius": 16,
            "circle-color": colors.primary,
            "circle-opacity": 0.15,
          }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="user-location-dot" data={pointData}>
        <Layer
          type="circle"
          id="user-location-outer"
          paint={{
            "circle-radius": 8,
            "circle-color": "#FFFFFF",
          }}
        />
        <Layer
          type="circle"
          id="user-location-inner"
          paint={{
            "circle-radius": 6,
            "circle-color": colors.primary,
          }}
        />
      </GeoJSONSource>
    </>
  );
}
