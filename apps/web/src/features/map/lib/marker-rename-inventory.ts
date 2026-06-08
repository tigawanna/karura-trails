import { buildMarkerRenamePlan } from "@/lib/map/marker-rename-planner";
import {
  parseVirtualRef,
  resolveMapPointLabel,
  resolveMarkerKind,
} from "@/lib/map/virtual-marker-naming";
import type { MarkerRenameInventoryExport, MarkerRenameProposal } from "@/types/map/marker-rename";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import { buildMarkerNeighborIndex } from "@/lib/map/marker-neighbor-index";

function buildNeighborLabels(
  pointId: number,
  mapPoints: MapPointRecord[],
  neighbors: MarkerNeighborRecord[],
): string[] {
  const index = buildMarkerNeighborIndex(neighbors);
  const pointsById = new Map(mapPoints.map((point) => [point.id, point]));
  const neighborIds = [
    ...new Set([...(index.outgoing.get(pointId) ?? []), ...(index.incoming.get(pointId) ?? [])]),
  ];

  return neighborIds
    .map((neighborId) => {
      const neighbor = pointsById.get(neighborId);
      if (!neighbor) {
        return null;
      }
      return resolveMapPointLabel(neighbor) || `#${neighborId}`;
    })
    .filter((label): label is string => Boolean(label))
    .sort();
}

export function buildMarkerRenameInventory(input: {
  mapId: number;
  mapName: string;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  proposals?: MarkerRenameProposal[];
}): MarkerRenameInventoryExport {
  const proposals =
    input.proposals ??
    buildMarkerRenamePlan({
      mapId: input.mapId,
      mapPoints: input.mapPoints,
      markerNeighbors: input.markerNeighbors,
    }).proposals;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    mapId: input.mapId,
    mapName: input.mapName,
    markers: input.mapPoints.map((point) => ({
      id: point.id,
      ref: point.ref,
      name: point.name,
      category: point.category,
      kind: resolveMarkerKind(point),
      parentRef: point.parentRef,
      sortOrder: point.sortOrder,
      latitude: point.latitude,
      longitude: point.longitude,
      description: point.description,
      neighborLabels: buildNeighborLabels(point.id, input.mapPoints, input.markerNeighbors),
    })),
    proposals: proposals.map((proposal) => ({
      pointId: proposal.pointId,
      beforeRef: proposal.beforeRef,
      beforeName: proposal.beforeName,
      afterRef: proposal.afterRef,
      afterName: proposal.afterName,
      reason: proposal.reason,
      approved: true,
    })),
  };
}

export function parseMarkerRenameInventory(payload: unknown): MarkerRenameInventoryExport {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("version" in payload) ||
    payload.version !== 1 ||
    !("markers" in payload) ||
    !Array.isArray(payload.markers)
  ) {
    throw new Error("Unsupported rename inventory format. Expected version 1.");
  }

  return payload as MarkerRenameInventoryExport;
}

export function proposalsFromInventory(
  inventory: MarkerRenameInventoryExport,
  mapPoints: MapPointRecord[],
  markerNeighbors: MarkerNeighborRecord[],
): MarkerRenameProposal[] {
  const pointsById = new Map(mapPoints.map((point) => [point.id, point]));

  const proposals: MarkerRenameProposal[] = [];

  for (const entry of inventory.proposals) {
    const point = pointsById.get(entry.pointId);
    if (!point) {
      continue;
    }

    const parsed = parseVirtualRef(entry.afterRef);
    proposals.push({
      pointId: entry.pointId,
      anchorRef: parsed?.anchorRef ?? entry.afterRef,
      kind: resolveMarkerKind(point),
      beforeRef: entry.beforeRef,
      beforeName: entry.beforeName,
      afterRef: entry.afterRef,
      afterName: entry.afterName,
      afterParentRef: parsed?.anchorRef ?? null,
      afterSortOrder: parsed?.sequence ?? point.sortOrder,
      reason: entry.reason || "Imported rename plan",
      neighborLabels: buildNeighborLabels(entry.pointId, mapPoints, markerNeighbors),
      category: point.category,
      latitude: point.latitude,
      longitude: point.longitude,
    });
  }

  return proposals;
}

export function downloadMarkerRenameInventory(
  filename: string,
  payload: MarkerRenameInventoryExport,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
