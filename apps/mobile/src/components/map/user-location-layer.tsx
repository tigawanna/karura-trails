import React, { useMemo } from "react";
import { Marker } from "@maplibre/maplibre-react-native";

import { UserLocationArrowIcon } from "@/components/map/user-location-arrow-icon";

interface UserLocationLayerProps {
  longitude: number;
  latitude: number;
  heading?: number | null;
}

export function UserLocationLayer({ longitude, latitude, heading = null }: UserLocationLayerProps) {
  const lngLat = useMemo((): [number, number] => [longitude, latitude], [latitude, longitude]);

  return (
    <Marker id="user-location-marker" lngLat={lngLat} anchor="bottom">
      <UserLocationArrowIcon heading={heading} />
    </Marker>
  );
}
