import * as Location from "expo-location";
import { useEffect, useState } from "react";

export function useDeviceHeading(active = true) {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) {
        return;
      }

      subscription = await Location.watchHeadingAsync((value) => {
        const next = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
        if (Number.isFinite(next)) {
          setHeading(next);
        }
      });
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active]);

  return heading;
}
