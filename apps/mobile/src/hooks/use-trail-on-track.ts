import { useMemo } from "react";

import { routingPointsQueryOptions } from "@/data-access-layer/routing-graph";
import type { PointWithGeometry } from "@/data-access-layer/points";
import { geomParse, isValidPoint } from "@/geo/geom-parse";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useQuery } from "@tanstack/react-query";

export type MarkerProximityMatch = {
  marker: PointWithGeometry;
  distanceMeters: number;
};

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useTrailOnTrack() {
  const { location, errorMsg, isLoading: locationLoading } = useDeviceLocation();
  const { data: markers, isLoading: markersLoading } = useQuery(routingPointsQueryOptions);

  const match = useMemo(() => {
    if (!location || !markers || markers.length === 0) {
      return null;
    }

    const { longitude, latitude } = location.coords;
    let nearest: (typeof markers)[number] | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const marker of markers) {
      const geometry = geomParse(marker.geom);
      if (!isValidPoint(geometry)) {
        continue;
      }

      const coords = geometry.coordinates;
      const lng = typeof coords[0] === "number" ? coords[0] : 0;
      const lat = typeof coords[1] === "number" ? coords[1] : 0;
      const distance = haversineDistanceMeters(latitude, longitude, lat, lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = marker;
      }
    }

    if (!nearest || nearestDistance > 40) {
      return null;
    }

    return {
      marker: nearest,
      distanceMeters: nearestDistance,
    };
  }, [location, markers]);

  return {
    match,
    location,
    errorMsg,
    isLoading: locationLoading || markersLoading,
  };
}
