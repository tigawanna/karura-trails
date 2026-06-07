export type RouteSearchParams = {
  from?: string;
  to?: string;
  via?: string;
};

export function serializeViaRefs(viaRefs: string[]): string {
  return viaRefs.filter(Boolean).join(",");
}

export function parseViaRefs(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
