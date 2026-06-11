import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useMemo } from "react";

import { isDevBuild } from "@/lib/dev/is-dev-build";
import {
  clearLocationSpoof,
  loadLocationSpoof,
  saveLocationSpoof,
  type LocationSpoofState,
} from "@/lib/dev/location-spoof-storage";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { requestFreshGpsLocation } from "@/services/location/location-watch-service";

function buildLocationObject(latitude: number, longitude: number): Location.LocationObject {
  return {
    coords: {
      latitude,
      longitude,
      altitude: 1680,
      accuracy: 5,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  };
}

export function useDeviceLocation() {
  const queryClient = useQueryClient();
  const devBuild = isDevBuild();

  const { data: spoof, isLoading: spoofLoading } = useQuery({
    queryKey: [queryKeyPrefixes.devLocationSpoof],
    queryFn: loadLocationSpoof,
    enabled: devBuild,
  });

  const {
    data: gpsLocation,
    error,
    isLoading: gpsLoading,
  } = useQuery({
    queryKey: [queryKeyPrefixes.deviceLocation, "gps"],
    queryFn: () => requestFreshGpsLocation(queryClient),
    enabled: !spoof?.enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const location = useMemo(() => {
    if (spoof?.enabled) {
      return buildLocationObject(spoof.latitude, spoof.longitude);
    }
    return gpsLocation;
  }, [gpsLocation, spoof]);

  const applySpoof = useCallback(
    async (latitude: number, longitude: number) => {
      const next: LocationSpoofState = { enabled: true, latitude, longitude };
      await saveLocationSpoof(next);
      queryClient.setQueryData([queryKeyPrefixes.devLocationSpoof], next);
      queryClient.setQueryData(
        [queryKeyPrefixes.deviceLocation, "gps"],
        buildLocationObject(latitude, longitude),
      );
    },
    [queryClient],
  );

  const clearSpoof = useCallback(async () => {
    await clearLocationSpoof();
    queryClient.setQueryData([queryKeyPrefixes.devLocationSpoof], null);
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.deviceLocation, "gps"] });
  }, [queryClient]);

  const { mutate: refreshLocation, isPending: isRefreshing } = useMutation({
    mutationFn: () => requestFreshGpsLocation(queryClient),
    onSuccess: (data) => {
      queryClient.setQueryData([queryKeyPrefixes.deviceLocation, "gps"], data);
    },
  });

  const manuallySetLocation = useCallback(
    (lat: number, lng: number) => {
      if (devBuild) {
        void applySpoof(lat, lng);
        return;
      }
      queryClient.setQueryData(
        [queryKeyPrefixes.deviceLocation, "gps"],
        buildLocationObject(lat, lng),
      );
    },
    [applySpoof, devBuild, queryClient],
  );

  return {
    location,
    errorMsg: spoof?.enabled ? null : (error?.message ?? null),
    isLoading: spoof?.enabled ? spoofLoading : gpsLoading,
    isRefreshing,
    refreshLocation,
    manuallySetLocation,
    isSpoofed: Boolean(spoof?.enabled),
    applySpoof: devBuild ? applySpoof : undefined,
    clearSpoof: devBuild ? clearSpoof : undefined,
  };
}
