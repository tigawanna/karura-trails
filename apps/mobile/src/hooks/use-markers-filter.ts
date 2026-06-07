import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import { mapPointFeatureSearchHaystack } from "@/geo/map-point-features";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { markerLabel } from "@/geo/nearest-marker";
import { useRoutingGraphData } from "@/hooks/use-routing-graph-data";

export function useMarkersFilter(searchQuery: string, activeFeatureSlugs: string[]) {
  const { enrichedPoints, isLoading } = useRoutingGraphData();
  const { data: catalog = [] } = useQuery(landmarkTypesQueryOptions);

  const markers = useMemo(() => {
    let results = enrichedPoints;

    if (activeFeatureSlugs.length > 0) {
      results = results.filter((point) =>
        activeFeatureSlugs.some((slug) => point.featureSlugs.includes(slug)),
      );
    }

    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return results;
    }

    return results.filter((point) => {
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
      return haystack.includes(normalized) || markerLabel(point).toLowerCase().includes(normalized);
    });
  }, [activeFeatureSlugs, catalog, enrichedPoints, searchQuery]);

  return {
    markers,
    totalCount: enrichedPoints.length,
    isLoading,
  };
}

export function markerListKey(marker: EnrichedRoutingPoint): string {
  return String(marker.id);
}
