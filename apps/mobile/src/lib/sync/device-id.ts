import AsyncStorage from "@react-native-async-storage/async-storage";

import { createSyncEventId } from "@/lib/sync/create-sync-event-id";

const DEVICE_ID_KEY = "karura-trails-device-id";

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = createSyncEventId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
