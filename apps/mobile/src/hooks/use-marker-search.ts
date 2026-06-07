import { useMemo } from "react";

import { mapPointFeatureSearchHaystack } from "@/geo/map-point-features";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel } from "@/geo/nearest-marker";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";
import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import { useQuery } from "@tanstack/react-query";

export function useMarkerSearch(query: string, limit = 12) {
  const { enrichedPoints } = useRoutingGraphData();
  const { data: catalog = [] } = useQuery(landmarkTypesQueryOptions);

  return useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return enrichedPoints.slice(0, limit);
    }

    return enrichedPoints
      .filter((point) => {
        const haystack = mapPointFeatureSearchHaystack(
          {
            category: point.category,
            name: point.name,
            ref: point.ref,
            description: point.description,
            metadata: point.metadata,
          },
          catalog,
        );
        return (
          haystack.includes(normalized) || markerLabel(point).toLowerCase().includes(normalized)
        );
      })
      .slice(0, limit);
  }, [catalog, enrichedPoints, limit, query]);
}

export function resolveMarkerByRef(
  pointsByRef: Map<string, EnrichedRoutingPoint>,
  ref: string | undefined,
): EnrichedRoutingPoint | null {
  if (!ref?.trim()) {
    return null;
  }
  return pointsByRef.get(ref.trim()) ?? null;
}
