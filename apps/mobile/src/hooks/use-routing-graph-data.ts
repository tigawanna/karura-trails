import { useMemo } from "react";

const EMPTY_ENRICHED_POINTS: EnrichedRoutingPoint[] = [];

import type { NeighborLinkWithGeometry } from "@/data-access-layer/routing-graph";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import type { GraphEdge, GraphPoint } from "@/geo/graph/neighbor-graph";
import { pointCoordinates } from "@/geo/nearest-marker";
import { useEnrichedRoutingPoints } from "@/hooks/use-enriched-routing-points";
import { useNeighborLinks } from "@/hooks/use-routing-graph";

function toGraphPoint(point: EnrichedRoutingPoint): GraphPoint | null {
  const coordinates = pointCoordinates(point);
  if (!coordinates) {
    return null;
  }

  return {
    id: point.id,
    ref: point.ref,
    name: point.name,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    category: point.category,
    nodeRole: point.nodeRole,
  };
}

function toGraphEdges(links: NeighborLinkWithGeometry[]): GraphEdge[] {
  return links.map((link) => ({
    fromPointId: link.fromPointId,
    toPointId: link.toPointId,
  }));
}

export function useRoutingGraphData() {
  const pointsQuery = useEnrichedRoutingPoints();
  const linksQuery = useNeighborLinks();

  const graphPoints = useMemo(() => {
    return (pointsQuery.data ?? [])
      .map((point) => toGraphPoint(point))
      .filter((point): point is GraphPoint => point != null);
  }, [pointsQuery.data]);

  const graphEdges = useMemo(() => toGraphEdges(linksQuery.data ?? []), [linksQuery.data]);

  const pointsById = useMemo(() => {
    return new Map((pointsQuery.data ?? []).map((point) => [point.id, point]));
  }, [pointsQuery.data]);

  const pointsByRef = useMemo(() => {
    const map = new Map<string, EnrichedRoutingPoint>();
    for (const point of pointsQuery.data ?? []) {
      if (point.ref?.trim()) {
        map.set(point.ref.trim(), point);
      }
    }
    return map;
  }, [pointsQuery.data]);

  const enrichedPoints = useMemo(
    () => pointsQuery.data ?? EMPTY_ENRICHED_POINTS,
    [pointsQuery.data],
  );

  return {
    enrichedPoints,
    graphPoints,
    graphEdges,
    pointsById,
    pointsByRef,
    isLoading: pointsQuery.isLoading || linksQuery.isLoading,
    isError: pointsQuery.isError || linksQuery.isError,
  };
}
