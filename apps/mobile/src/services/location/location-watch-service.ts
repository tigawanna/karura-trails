import type { QueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { AppState, type AppStateStatus } from "react-native";

import {
  shouldAcceptLocationUpdate,
  type LocationUpdateContext,
} from "@/geo/location-update-policy";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 3,
};

let watcher: Location.LocationSubscription | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let resumeInFlight = false;
let subscriberCount = 0;
let activeQueryClient: QueryClient | null = null;

function getCachedLocation(queryClient: QueryClient): Location.LocationObject | null {
  return queryClient.getQueryData<Location.LocationObject>([
    queryKeyPrefixes.deviceLocation,
    "gps",
  ]) ?? null;
}

export function applyGpsLocationUpdate(
  queryClient: QueryClient,
  next: Location.LocationObject,
  context: LocationUpdateContext,
): boolean {
  const previous = getCachedLocation(queryClient);
  if (!shouldAcceptLocationUpdate(previous, next, context)) {
    return false;
  }

  queryClient.setQueryData([queryKeyPrefixes.deviceLocation, "gps"], next);
  return true;
}

async function refreshLocationOnResume(queryClient: QueryClient) {
  if (resumeInFlight) {
    return;
  }

  resumeInFlight = true;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const next = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    applyGpsLocationUpdate(queryClient, next, "resume");
  } catch {
    return;
  } finally {
    resumeInFlight = false;
  }
}

function handleAppStateChange(queryClient: QueryClient, status: AppStateStatus) {
  if (status === "active") {
    void refreshLocationOnResume(queryClient);
  }
}

async function startWatcher(queryClient: QueryClient) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return;
  }

  if (!getCachedLocation(queryClient)) {
    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      applyGpsLocationUpdate(queryClient, initial, "manual");
    } catch {
      return;
    }
  }

  if (watcher) {
    return;
  }

  watcher = await Location.watchPositionAsync(WATCH_OPTIONS, (position) => {
    applyGpsLocationUpdate(queryClient, position, "watch");
  });
}

function stopWatcher() {
  watcher?.remove();
  watcher = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  activeQueryClient = null;
}

export function subscribeLocationWatch(queryClient: QueryClient) {
  subscriberCount += 1;
  activeQueryClient = queryClient;

  if (subscriberCount === 1) {
    void startWatcher(queryClient);
    appStateSubscription = AppState.addEventListener("change", (status) => {
      handleAppStateChange(queryClient, status);
    });
  }

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stopWatcher();
    }
  };
}

export async function requestFreshGpsLocation(queryClient: QueryClient) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission to access location was denied");
  }

  const next = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  applyGpsLocationUpdate(queryClient, next, "manual");
  return next;
}
