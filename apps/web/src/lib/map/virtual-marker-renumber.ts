import { buildMarkerNeighborIndex } from "@/lib/map/marker-neighbor-index";
import {
  formatVirtualRef,
  inferLegacyAnchorRef,
  isPhysicalMapPoint,
  parseVirtualRef,
  resolveMapPointLabel,
  type MapPointNamingSource,
} from "@/lib/map/virtual-marker-naming";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";

export type VirtualMarkerRenumberChange = {
  pointId: number;
  anchorRef: string;
  before: {
    ref: string | null;
    name: string | null;
    parentRef: string | null;
    sortOrder: number;
  };
  after: {
    ref: string;
    name: string;
    parentRef: string | null;
    sortOrder: number;
  };
};

export type VirtualMarkerRenumberPlan = {
  mapId: number;
  anchorCount: number;
  changedCount: number;
  unchangedCount: number;
  changes: VirtualMarkerRenumberChange[];
};

function getUndirectedNeighborIds(
  markerId: number,
  index: ReturnType<typeof buildMarkerNeighborIndex>,
) {
  return [
    ...new Set<number>([
      ...(index.outgoing.get(markerId) ?? []),
      ...(index.incoming.get(markerId) ?? []),
    ]),
  ];
}

function getVirtualNeighborIds(
  markerId: number,
  index: ReturnType<typeof buildMarkerNeighborIndex>,
  virtualIds: Set<number>,
  physicalIds: Set<number>,
): number[] {
  return getUndirectedNeighborIds(markerId, index).filter(
    (neighborId) => virtualIds.has(neighborId) && !physicalIds.has(neighborId),
  );
}

function walkVirtualSpur(
  startId: number,
  fromId: number,
  pointsById: Map<number, MapPointNamingSource>,
  index: ReturnType<typeof buildMarkerNeighborIndex>,
  virtualIds: Set<number>,
  physicalIds: Set<number>,
  visited: Set<number>,
): MapPointNamingSource[] {
  const ordered: MapPointNamingSource[] = [];
  let currentId: number | null = startId;
  let previousId = fromId;

  while (currentId !== null) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const point = pointsById.get(currentId);
    if (point) {
      ordered.push(point);
    }

    const branchStarts = getVirtualNeighborIds(currentId, index, virtualIds, physicalIds)
      .filter((neighborId) => neighborId !== previousId && !visited.has(neighborId))
      .sort((left, right) => left - right);

    if (branchStarts.length === 0) {
      break;
    }

    if (branchStarts.length === 1) {
      previousId = currentId;
      currentId = branchStarts[0] ?? null;
      continue;
    }

    for (const branchStartId of branchStarts) {
      ordered.push(
        ...walkVirtualSpur(
          branchStartId,
          currentId,
          pointsById,
          index,
          virtualIds,
          physicalIds,
          visited,
        ),
      );
    }
    break;
  }

  return ordered;
}

function sortVirtualPointsAlongPath(
  anchorId: number,
  virtualPoints: MapPointNamingSource[],
  neighbors: MarkerNeighborRecord[],
  physicalIds: Set<number>,
): MapPointNamingSource[] {
  if (virtualPoints.length <= 1) {
    return virtualPoints;
  }

  const index = buildMarkerNeighborIndex(neighbors);
  const virtualIds = new Set(virtualPoints.map((point) => point.id));
  const pointsById = new Map(virtualPoints.map((point) => [point.id, point]));
  const visited = new Set<number>([anchorId]);
  const ordered: MapPointNamingSource[] = [];

  const spurStarts = getVirtualNeighborIds(anchorId, index, virtualIds, physicalIds).sort(
    (left, right) => left - right,
  );

  for (const startId of spurStarts) {
    ordered.push(
      ...walkVirtualSpur(startId, anchorId, pointsById, index, virtualIds, physicalIds, visited),
    );
  }

  for (const point of virtualPoints) {
    if (!visited.has(point.id)) {
      ordered.push(point);
    }
  }

  return ordered;
}

function bfsVirtualDescendants(
  anchorId: number,
  pointsById: Map<number, MapPointNamingSource>,
  neighbors: MarkerNeighborRecord[],
  physicalIds: Set<number>,
): MapPointNamingSource[] {
  const index = buildMarkerNeighborIndex(neighbors);
  const visited = new Set<number>([anchorId]);
  const queue = [anchorId];
  const discovered: MapPointNamingSource[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      break;
    }

    for (const neighborId of getUndirectedNeighborIds(currentId, index)) {
      if (visited.has(neighborId)) {
        continue;
      }
      visited.add(neighborId);

      if (neighborId !== anchorId && physicalIds.has(neighborId)) {
        continue;
      }

      const point = pointsById.get(neighborId);
      if (point && neighborId !== anchorId && !isPhysicalMapPoint(point)) {
        discovered.push(point);
      }

      queue.push(neighborId);
    }
  }

  return discovered;
}

function resolveRenumberedName(point: MapPointNamingSource, newRef: string): string {
  const name = point.name?.trim() || "";
  const ref = point.ref?.trim() || "";
  if (!name || name === ref) {
    return newRef;
  }
  return name;
}

export function planVirtualMarkerRenumber(input: {
  mapId: number;
  mapPoints: MapPointNamingSource[];
  neighbors: MarkerNeighborRecord[];
  anchorPointId?: number | null;
}): VirtualMarkerRenumberPlan {
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));
  const physicalPoints = input.mapPoints.filter((point) => isPhysicalMapPoint(point));
  const physicalIds = new Set(physicalPoints.map((point) => point.id));

  const anchors =
    input.anchorPointId != null
      ? physicalPoints.filter((point) => point.id === input.anchorPointId)
      : physicalPoints.filter((point) => resolveMapPointLabel(point));

  const groups = new Map<
    string,
    { anchorPoint: MapPointNamingSource; virtualPoints: MapPointNamingSource[] }
  >();
  for (const anchor of anchors) {
    const anchorRef = resolveMapPointLabel(anchor);
    if (!anchorRef) {
      continue;
    }
    groups.set(anchorRef, { anchorPoint: anchor, virtualPoints: [] });
  }

  const assigned = new Set<number>();

  for (const point of input.mapPoints) {
    if (isPhysicalMapPoint(point)) {
      continue;
    }

    const label = resolveMapPointLabel(point);
    const anchorRef =
      point.parentRef?.trim() ||
      (label ? inferLegacyAnchorRef(label) : null) ||
      (label ? parseVirtualRef(label)?.anchorRef : null);

    if (!anchorRef || !groups.has(anchorRef)) {
      continue;
    }

    if (
      input.anchorPointId != null &&
      groups.get(anchorRef)?.anchorPoint.id !== input.anchorPointId
    ) {
      continue;
    }

    groups.get(anchorRef)?.virtualPoints.push(point);
    assigned.add(point.id);
  }

  for (const group of groups.values()) {
    const bfsPoints = bfsVirtualDescendants(
      group.anchorPoint.id,
      pointsById,
      input.neighbors,
      physicalIds,
    );

    for (const point of bfsPoints) {
      if (assigned.has(point.id)) {
        continue;
      }
      group.virtualPoints.push(point);
      assigned.add(point.id);
    }

    group.virtualPoints = sortVirtualPointsAlongPath(
      group.anchorPoint.id,
      group.virtualPoints,
      input.neighbors,
      physicalIds,
    );
  }

  const changes: VirtualMarkerRenumberChange[] = [];

  if (input.anchorPointId == null) {
    for (const point of input.mapPoints) {
      if (!isPhysicalMapPoint(point)) {
        continue;
      }
      const label = resolveMapPointLabel(point);
      if (!label || point.ref?.trim() === label) {
        continue;
      }
      changes.push({
        pointId: point.id,
        anchorRef: label,
        before: {
          ref: point.ref ?? null,
          name: point.name,
          parentRef: point.parentRef ?? null,
          sortOrder: point.sortOrder ?? 0,
        },
        after: {
          ref: label,
          name: point.name?.trim() || label,
          parentRef: null,
          sortOrder: point.sortOrder ?? 0,
        },
      });
    }
  }

  for (const [anchorRef, group] of groups) {
    group.virtualPoints.forEach((point, index) => {
      const sequence = index + 1;
      const newRef = formatVirtualRef(anchorRef, sequence);
      const before = {
        ref: point.ref,
        name: point.name,
        parentRef: point.parentRef ?? null,
        sortOrder: point.sortOrder ?? 0,
      };
      const after = {
        ref: newRef,
        name: resolveRenumberedName(point, newRef),
        parentRef: anchorRef,
        sortOrder: sequence,
      };

      if (
        before.ref !== after.ref ||
        before.parentRef !== after.parentRef ||
        before.sortOrder !== after.sortOrder ||
        before.name !== after.name
      ) {
        changes.push({
          pointId: point.id,
          anchorRef,
          before,
          after,
        });
      }
    });
  }

  changes.sort((left, right) => {
    const sortOrderDelta = left.after.sortOrder - right.after.sortOrder;
    if (sortOrderDelta !== 0) {
      return sortOrderDelta;
    }
    return left.pointId - right.pointId;
  });

  return {
    mapId: input.mapId,
    anchorCount: groups.size,
    changedCount: changes.length,
    unchangedCount: input.mapPoints.length - changes.length,
    changes,
  };
}
