import { enrichedRoutingPointsQueryOptions } from "@/data-access-layer/routing-graph";
import { useQuery } from "@tanstack/react-query";

export function useEnrichedRoutingPoints() {
  return useQuery(enrichedRoutingPointsQueryOptions);
}
