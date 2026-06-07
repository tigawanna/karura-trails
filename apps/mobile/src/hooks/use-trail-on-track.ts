import { useMemo } from "react";

import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { findNearestMarker } from "@/geo/nearest-marker";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";

export type MarkerProximityMatch = {
  marker: EnrichedRoutingPoint;
  distanceMeters: number;
};

export function useTrailOnTrack() {
  const { location: staticLocation, errorMsg, isLoading: locationLoading } = useDeviceLocation();
  const liveLocation = useLiveLocation(true);
  const location = liveLocation ?? staticLocation;
  const { enrichedPoints, isLoading: graphLoading } = useRoutingGraphData();

  const match = useMemo((): MarkerProximityMatch | null => {
    if (!location || enrichedPoints.length === 0) {
      return null;
    }

    const nearest = findNearestMarker(
      enrichedPoints,
      location.coords.latitude,
      location.coords.longitude,
    );

    if (!nearest || nearest.distanceMeters > 40) {
      return null;
    }

    return nearest;
  }, [enrichedPoints, location]);

  return {
    match,
    location,
    errorMsg,
    isLoading: locationLoading || graphLoading,
  };
}
