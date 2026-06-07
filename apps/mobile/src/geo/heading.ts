const MIN_GPS_SPEED_MPS = 1;

export function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function resolveUserLocationHeading(
  gpsHeading: number | null | undefined,
  gpsSpeed: number | null | undefined,
  compassHeading: number | null,
): number | null {
  const hasGpsHeading = gpsHeading != null && gpsHeading >= 0 && Number.isFinite(gpsHeading);
  const hasGpsSpeed = gpsSpeed != null && gpsSpeed >= MIN_GPS_SPEED_MPS;

  if (hasGpsHeading && hasGpsSpeed) {
    return normalizeDegrees(gpsHeading);
  }

  if (compassHeading != null && Number.isFinite(compassHeading)) {
    return normalizeDegrees(compassHeading);
  }

  if (hasGpsHeading) {
    return normalizeDegrees(gpsHeading);
  }

  return null;
}

export function headingToScreenRotation(heading: number | null, mapBearing: number): number | null {
  if (heading == null) {
    return null;
  }

  return normalizeDegrees(heading - mapBearing);
}
