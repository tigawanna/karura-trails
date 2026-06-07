import { useMemo } from "react";

import { findNearestMarker, isNearKarura } from "@/geo/nearest-marker";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";

export function useNearestMarker() {
  const { location: staticLocation, errorMsg, isLoading: locationLoading } = useDeviceLocation();
  const liveLocation = useLiveLocation(true);
  const location = liveLocation ?? staticLocation;
  const { enrichedPoints, isLoading: graphLoading } = useRoutingGraphData();

  const nearKarura = useMemo(() => {
    if (!location) {
      return false;
    }
    return isNearKarura(location.coords.latitude, location.coords.longitude);
  }, [location]);

  const nearest = useMemo(() => {
    if (enrichedPoints.length === 0) {
      return null;
    }

    if (location && nearKarura) {
      const match = findNearestMarker(
        enrichedPoints,
        location.coords.latitude,
        location.coords.longitude,
      );
      if (match) {
        return match;
      }
    }

    const fallback = enrichedPoints.find((point) => point.category === "gate") ?? enrichedPoints[0];
    if (!fallback) {
      return null;
    }

    return { marker: fallback, distanceMeters: 0 };
  }, [enrichedPoints, location, nearKarura]);

  return {
    nearest,
    nearKarura,
    location,
    errorMsg,
    isLoading: locationLoading || graphLoading,
  };
}
