import { useMemo } from "react";

import { trailsQueryOptions } from "@/data-access-layer/trails";
import { findTrailOnTrack } from "@/geo/trail-tracking";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useQuery } from "@tanstack/react-query";

export function useTrailOnTrack() {
  const { location, errorMsg, isLoading: locationLoading } = useDeviceLocation();
  const { data: trails, isLoading: trailsLoading } = useQuery(trailsQueryOptions);

  const match = useMemo(() => {
    if (!location || !trails || trails.length === 0) {
      return null;
    }

    return findTrailOnTrack(location.coords.longitude, location.coords.latitude, trails);
  }, [location, trails]);

  return {
    match,
    location,
    errorMsg,
    isLoading: locationLoading || trailsLoading,
  };
}
