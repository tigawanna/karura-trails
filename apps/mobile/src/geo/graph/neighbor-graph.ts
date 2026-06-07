import { haversineDistanceMeters } from "@/geo/nearest-marker";

export type GraphPoint = {
  id: number;
  ref: string | null;
  name: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  nodeRole: string | null;
};

export type GraphEdge = {
  fromPointId: number;
  toPointId: number;
};

type WeightedEdge = {
  neighborId: number;
  weight: number;
};

export type GraphPathResult = {
  pointIds: number[];
  distanceMeters: number;
  found: boolean;
};

export type RouteSuggestion = {
  id: string;
  startPointId: number;
  endPointId: number;
  endRef: string | null;
  pointIds: number[];
  distanceMeters: number;
  endLabel: string;
};

function buildAdjacency(points: GraphPoint[], edges: GraphEdge[]): Map<number, WeightedEdge[]> {
  const pointsById = new Map(points.map((point) => [point.id, point]));
  const adjacency = new Map<number, WeightedEdge[]>();

  const addEdge = (fromId: number, toId: number) => {
    if (fromId === toId) {
      return;
    }

    const from = pointsById.get(fromId);
    const to = pointsById.get(toId);
    if (!from || !to) {
      return;
    }

    const weight = haversineDistanceMeters(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    );
    const normalizedWeight = weight > 0 ? weight : 1;
    const list = adjacency.get(fromId) ?? [];
    if (!list.some((entry) => entry.neighborId === toId)) {
      list.push({ neighborId: toId, weight: normalizedWeight });
      adjacency.set(fromId, list);
    }
  };

  for (const edge of edges) {
    addEdge(edge.fromPointId, edge.toPointId);
    addEdge(edge.toPointId, edge.fromPointId);
  }

  return adjacency;
}

function undirectedEdgeKey(fromId: number, toId: number): string {
  return fromId < toId ? `${fromId}:${toId}` : `${toId}:${fromId}`;
}

function reconstructPath(previous: Map<number, number | null>, endId: number): number[] {
  const path: number[] = [];
  let current: number | null = endId;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  return path;
}

function dijkstra(
  adjacency: Map<number, WeightedEdge[]>,
  startId: number,
  endId: number,
  blockedPointIds: ReadonlySet<number> = new Set<number>(),
  blockedEdges: ReadonlySet<string> = new Set<string>(),
): { distance: number; previous: Map<number, number | null> } | null {
  if (startId === endId) {
    return { distance: 0, previous: new Map([[endId, null]]) };
  }

  if (blockedPointIds.has(startId) || blockedPointIds.has(endId)) {
    return null;
  }

  const nodeIds = new Set<number>([...adjacency.keys(), startId, endId]);
  const distances = new Map<number, number>();
  const previous = new Map<number, number | null>();
  const unvisited = new Set<number>();

  for (const nodeId of nodeIds) {
    if (blockedPointIds.has(nodeId)) {
      continue;
    }
    distances.set(nodeId, Number.POSITIVE_INFINITY);
    previous.set(nodeId, null);
    unvisited.add(nodeId);
  }

  if (!unvisited.has(startId) || !unvisited.has(endId)) {
    return null;
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: number | null = null;
    let best = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        current = nodeId;
      }
    }

    if (current === null || best === Number.POSITIVE_INFINITY) {
      break;
    }

    if (current === endId) {
      break;
    }

    unvisited.delete(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (!unvisited.has(edge.neighborId) || blockedPointIds.has(edge.neighborId)) {
        continue;
      }
      if (blockedEdges.has(undirectedEdgeKey(current, edge.neighborId))) {
        continue;
      }
      const alt = (distances.get(current) ?? Number.POSITIVE_INFINITY) + edge.weight;
      const neighborDistance = distances.get(edge.neighborId) ?? Number.POSITIVE_INFINITY;
      if (alt < neighborDistance) {
        distances.set(edge.neighborId, alt);
        previous.set(edge.neighborId, current);
      }
    }
  }

  const endDistance = distances.get(endId);
  if (endDistance === undefined || endDistance === Number.POSITIVE_INFINITY) {
    return null;
  }

  return { distance: endDistance, previous };
}

export function findShortestPath(
  startId: number,
  endId: number,
  points: GraphPoint[],
  edges: GraphEdge[],
): GraphPathResult {
  const adjacency = buildAdjacency(points, edges);
  const result = dijkstra(adjacency, startId, endId);
  if (!result) {
    return { pointIds: [], distanceMeters: 0, found: false };
  }

  return {
    pointIds: reconstructPath(result.previous, endId),
    distanceMeters: result.distance,
    found: true,
  };
}

export function findRouteThroughWaypoints(
  waypointIds: number[],
  points: GraphPoint[],
  edges: GraphEdge[],
  blockedPointIds: number[] = [],
): GraphPathResult {
  if (waypointIds.length === 0) {
    return { pointIds: [], distanceMeters: 0, found: false };
  }

  if (waypointIds.length === 1) {
    return { pointIds: [...waypointIds], distanceMeters: 0, found: true };
  }

  const adjacency = buildAdjacency(points, edges);
  const blocked = new Set(blockedPointIds.filter((pointId) => !waypointIds.includes(pointId)));
  const merged: number[] = [];
  let totalDistance = 0;

  for (let index = 0; index < waypointIds.length - 1; index += 1) {
    const fromId = waypointIds[index]!;
    const toId = waypointIds[index + 1]!;
    const leg = dijkstra(adjacency, fromId, toId, blocked);
    if (!leg) {
      return { pointIds: [], distanceMeters: 0, found: false };
    }

    const legPath = reconstructPath(leg.previous, toId);
    merged.push(...(index === 0 ? legPath : legPath.slice(1)));
    totalDistance += leg.distance;
  }

  return {
    pointIds: merged,
    distanceMeters: totalDistance,
    found: true,
  };
}

export function findRouteAlternatives(
  fromId: number,
  toId: number,
  viaPointIds: number[],
  points: GraphPoint[],
  edges: GraphEdge[],
  blockedPointIds: number[] = [],
  maxAlternatives = 3,
): GraphPathResult[] {
  const waypointIds = [fromId, ...viaPointIds, toId];
  const adjacency = buildAdjacency(points, edges);
  const blockedNodes = new Set(blockedPointIds.filter((pointId) => !waypointIds.includes(pointId)));

  const primary = findRouteThroughWaypoints(waypointIds, points, edges, blockedPointIds);
  if (!primary.found) {
    return [];
  }

  const alternatives: GraphPathResult[] = [primary];
  const seen = new Set([primary.pointIds.join(",")]);

  for (const hop of adjacency.get(fromId) ?? []) {
    if (alternatives.length >= maxAlternatives) {
      break;
    }
    const hopId = hop.neighborId;
    if (hopId === toId || waypointIds.includes(hopId)) {
      continue;
    }

    const forcedWaypoints =
      viaPointIds.length === 0 ? [fromId, hopId, toId] : [fromId, hopId, ...viaPointIds, toId];
    const dedupedWaypoints = forcedWaypoints.filter(
      (pointId, index) => index === 0 || pointId !== forcedWaypoints[index - 1],
    );
    const candidate = findRouteThroughWaypoints(dedupedWaypoints, points, edges, blockedPointIds);
    const key = candidate.pointIds.join(",");
    if (candidate.found && !seen.has(key)) {
      seen.add(key);
      alternatives.push(candidate);
    }
  }

  for (
    let index = 0;
    index < primary.pointIds.length - 1 && alternatives.length < maxAlternatives;
    index += 1
  ) {
    const from = primary.pointIds[index]!;
    const to = primary.pointIds[index + 1]!;
    const blockedEdges = new Set([undirectedEdgeKey(from, to)]);
    const merged: number[] = [];
    let totalDistance = 0;

    for (let legIndex = 0; legIndex < waypointIds.length - 1; legIndex += 1) {
      const legFrom = waypointIds[legIndex]!;
      const legTo = waypointIds[legIndex + 1]!;
      const leg = dijkstra(adjacency, legFrom, legTo, blockedNodes, blockedEdges);
      if (!leg) {
        merged.length = 0;
        break;
      }
      const legPath = reconstructPath(leg.previous, legTo);
      merged.push(...(legIndex === 0 ? legPath : legPath.slice(1)));
      totalDistance += leg.distance;
    }

    if (merged.length === 0) {
      continue;
    }

    const key = merged.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      alternatives.push({
        pointIds: merged,
        distanceMeters: totalDistance,
        found: true,
      });
    }
  }

  return alternatives.slice(0, maxAlternatives);
}

function pointLabel(point: GraphPoint): string {
  return point.ref?.trim() || point.name?.trim() || `#${point.id}`;
}

function isRouteDestination(point: GraphPoint): boolean {
  return (
    point.category === "gate" || point.nodeRole === "endpoint" || point.category === "junction"
  );
}

export function suggestRoutesFromPoint(
  startPointId: number,
  points: GraphPoint[],
  edges: GraphEdge[],
  maxRoutes = 5,
): RouteSuggestion[] {
  const pointsById = new Map(points.map((point) => [point.id, point]));
  const adjacency = buildAdjacency(points, edges);
  const start = pointsById.get(startPointId);
  if (!start) {
    return [];
  }

  const candidates = points.filter(
    (point) => point.id !== startPointId && isRouteDestination(point),
  );

  const suggestions: RouteSuggestion[] = [];

  for (const candidate of candidates) {
    const path = dijkstra(adjacency, startPointId, candidate.id);
    if (!path) {
      continue;
    }

    suggestions.push({
      id: `${startPointId}-${candidate.id}`,
      startPointId,
      endPointId: candidate.id,
      endRef: candidate.ref,
      pointIds: reconstructPath(path.previous, candidate.id),
      distanceMeters: path.distance,
      endLabel: pointLabel(candidate),
    });
  }

  suggestions.sort((left, right) => left.distanceMeters - right.distanceMeters);

  const uniqueByEnd = new Map<number, RouteSuggestion>();
  for (const suggestion of suggestions) {
    if (!uniqueByEnd.has(suggestion.endPointId)) {
      uniqueByEnd.set(suggestion.endPointId, suggestion);
    }
  }

  const firstHopBuckets = new Map<number, RouteSuggestion>();
  for (const suggestion of uniqueByEnd.values()) {
    const firstHop = suggestion.pointIds[1];
    if (firstHop === undefined) {
      continue;
    }
    const existing = firstHopBuckets.get(firstHop);
    if (!existing || suggestion.distanceMeters < existing.distanceMeters) {
      firstHopBuckets.set(firstHop, suggestion);
    }
  }

  const directional = [...firstHopBuckets.values()].sort(
    (left, right) => left.distanceMeters - right.distanceMeters,
  );

  if (directional.length >= maxRoutes) {
    return directional.slice(0, maxRoutes);
  }

  const merged = [...directional];
  for (const suggestion of uniqueByEnd.values()) {
    if (merged.length >= maxRoutes) {
      break;
    }
    if (!merged.some((entry) => entry.endPointId === suggestion.endPointId)) {
      merged.push(suggestion);
    }
  }

  return merged.slice(0, maxRoutes);
}
