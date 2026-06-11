import type * as Location from "expo-location";

import { haversineDistanceMeters } from "@/geo/nearest-marker";

export const LOCATION_MIN_DISTANCE_METERS = 3;
export const LOCATION_MAX_JUMP_METERS = 80;
export const LOCATION_GOOD_ACCURACY_METERS = 25;
export const LOCATION_POOR_ACCURACY_METERS = 75;

export type LocationUpdateContext = "watch" | "manual" | "resume";

function locationDistanceMeters(
  left: Location.LocationObject,
  right: Location.LocationObject,
): number {
  return haversineDistanceMeters(
    left.coords.latitude,
    left.coords.longitude,
    right.coords.latitude,
    right.coords.longitude,
  );
}

export function shouldAcceptLocationUpdate(
  previous: Location.LocationObject | null,
  next: Location.LocationObject,
  context: LocationUpdateContext = "watch",
): boolean {
  if (!previous) {
    return true;
  }

  if (context === "manual") {
    return true;
  }

  const previousAccuracy = previous.coords.accuracy ?? null;
  const nextAccuracy = next.coords.accuracy ?? null;
  const ageMs = Math.max(0, Date.now() - previous.timestamp);
  const distanceMeters = locationDistanceMeters(previous, next);

  if (nextAccuracy != null && nextAccuracy > LOCATION_POOR_ACCURACY_METERS) {
    return false;
  }

  if (
    previousAccuracy != null &&
    nextAccuracy != null &&
    previousAccuracy <= LOCATION_GOOD_ACCURACY_METERS &&
    nextAccuracy > previousAccuracy * 1.8 &&
    distanceMeters > LOCATION_MIN_DISTANCE_METERS
  ) {
    return false;
  }

  if (
    distanceMeters > LOCATION_MAX_JUMP_METERS &&
    nextAccuracy != null &&
    nextAccuracy > 35 &&
    ageMs < 30_000
  ) {
    return false;
  }

  if (context === "resume") {
    if (ageMs >= 60_000 && nextAccuracy != null && nextAccuracy <= LOCATION_GOOD_ACCURACY_METERS) {
      return true;
    }
    if (ageMs >= 60_000 && nextAccuracy != null && nextAccuracy > 50) {
      return false;
    }
    return distanceMeters >= LOCATION_MIN_DISTANCE_METERS || ageMs >= 15_000;
  }

  return distanceMeters >= LOCATION_MIN_DISTANCE_METERS;
}
