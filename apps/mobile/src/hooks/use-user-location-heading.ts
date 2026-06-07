import type * as Location from "expo-location";
import { useMemo } from "react";

import { resolveUserLocationHeading } from "@/geo/heading";
import { useDeviceHeading } from "@/hooks/use-device-heading";

export function useUserLocationHeading(
  location: Location.LocationObject | null | undefined,
  active = true,
) {
  const compassHeading = useDeviceHeading(active);

  return useMemo(
    () =>
      resolveUserLocationHeading(location?.coords.heading, location?.coords.speed, compassHeading),
    [compassHeading, location?.coords.heading, location?.coords.speed],
  );
}
