import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { MapBasemapPreset } from "@/lib/map-libre/map-style";

const STORAGE_KEY = "map-basemap-preset";

function isMapBasemapPreset(value: string | null): value is MapBasemapPreset {
  return value === "minimal" || value === "standard";
}

export function useMapBasemapPreference() {
  const [preset, setPresetState] = useState<MapBasemapPreset>("minimal");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && isMapBasemapPreset(stored)) {
          setPresetState(stored);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setPreset = useCallback(async (next: MapBasemapPreset) => {
    setPresetState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { preset, setPreset, isReady };
}
