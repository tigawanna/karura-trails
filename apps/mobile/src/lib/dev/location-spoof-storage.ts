import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "dev-location-spoof";

export interface LocationSpoofState {
  enabled: boolean;
  latitude: number;
  longitude: number;
}

function isLocationSpoofState(value: unknown): value is LocationSpoofState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as LocationSpoofState;
  return (
    typeof candidate.enabled === "boolean" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number"
  );
}

export async function loadLocationSpoof(): Promise<LocationSpoofState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isLocationSpoofState(parsed)) {
      return null;
    }
    return parsed.enabled ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLocationSpoof(state: LocationSpoofState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearLocationSpoof(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
