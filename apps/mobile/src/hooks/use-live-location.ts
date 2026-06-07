import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

import { useDeviceLocation } from "@/hooks/use-device-location";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";

export function useLiveLocation(active: boolean) {
  const queryClient = useQueryClient();
  const { location: baseLocation, isSpoofed } = useDeviceLocation();
  const [liveLocation, setLiveLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    if (!active || isSpoofed) {
      setLiveLocation(null);
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 4,
          timeInterval: 2000,
        },
        (position) => {
          setLiveLocation(position);
          queryClient.setQueryData([queryKeyPrefixes.deviceLocation, "gps"], position);
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active, isSpoofed, queryClient]);

  if (!active) {
    return baseLocation ?? null;
  }

  return liveLocation ?? baseLocation ?? null;
}
