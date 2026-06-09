import { resolveMarkerKind } from "@/lib/map/virtual-marker-naming";
import type { MapPointRecord } from "@/types/map/map-points";

export function filterMapPointsForMapDisplay(
  mapPoints: MapPointRecord[],
  options: {
    hideVirtualMarkers: boolean;
    alwaysVisiblePointIds?: Iterable<number>;
  },
): MapPointRecord[] {
  if (!options.hideVirtualMarkers) {
    return mapPoints;
  }

  const alwaysVisible = new Set(options.alwaysVisiblePointIds ?? []);
  return mapPoints.filter((point) => {
    if (alwaysVisible.has(point.id)) {
      return true;
    }
    const kind = resolveMarkerKind(point);
    return kind === "physical" || kind === "landmark";
  });
}
