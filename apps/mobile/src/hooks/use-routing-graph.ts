import {
  neighborLinksQueryOptions,
  routingPointsQueryOptions,
} from "@/data-access-layer/routing-graph";
import { useQuery } from "@tanstack/react-query";

export function useRoutingPoints() {
  return useQuery(routingPointsQueryOptions);
}

export function useNeighborLinks() {
  return useQuery(neighborLinksQueryOptions);
}
