import { buildMarkerNeighborIndex } from "@/lib/map/marker-neighbor-index";
import { humanizeFeatureSlug, resolveMapPointFeatureSlugs } from "@/lib/map/map-point-features";
import { planVirtualMarkerRenumber } from "@/lib/map/virtual-marker-renumber";
import {
  inferLegacyAnchorRef,
  isVirtualRef,
  resolveMapPointLabel,
  resolveMarkerKind,
  type MapPointNamingSource,
} from "@/lib/map/virtual-marker-naming";
import type { MarkerRenamePlan, MarkerRenameProposal } from "@/types/map/marker-rename";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";

function looksLikeLegacyVirtualLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) {
    return false;
  }
  if (/\.a\d/i.test(trimmed)) {
    return true;
  }
  if (inferLegacyAnchorRef(trimmed) && !isVirtualRef(trimmed)) {
    return true;
  }
  return false;
}

function proposeDisplayName(
  point: MapPointRecord,
  anchorRef: string,
  newRef: string,
): { name: string; reason: string } {
  const kind = resolveMarkerKind(point);
  const slugs = resolveMapPointFeatureSlugs(point);
  const currentName = point.name?.trim() || "";
  const currentRef = point.ref?.trim() || "";

  if (slugs.length > 0 && anchorRef) {
    const featureLabel = humanizeFeatureSlug(slugs[0] ?? "").toLowerCase();
    if (featureLabel) {
      return {
        name: `${anchorRef} - ${featureLabel}`,
        reason: "Landmark label from feature type",
      };
    }
  }

  if (kind === "virtual") {
    if (currentName && looksLikeLegacyVirtualLabel(currentName)) {
      return { name: newRef, reason: "Replace legacy virtual label with anchor.N" };
    }
    if (!currentName || currentName === currentRef) {
      return { name: newRef, reason: "Virtual marker sequence along path" };
    }
    return { name: currentName, reason: "Keep custom virtual display name" };
  }

  if (kind === "physical") {
    if (currentRef !== newRef) {
      return { name: newRef, reason: "Align physical guidepost ref with label" };
    }
    return { name: currentName || newRef, reason: "Physical anchor unchanged" };
  }

  if (currentName && !looksLikeLegacyVirtualLabel(currentName)) {
    return { name: currentName, reason: "Keep descriptive landmark name" };
  }

  return { name: newRef, reason: "Default landmark label" };
}

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

function toNamingSource(point: MapPointRecord): MapPointNamingSource {
  return {
    id: point.id,
    ref: point.ref,
    name: point.name,
    parentRef: point.parentRef,
    sortOrder: point.sortOrder,
    metadata: point.metadata,
  };
}

export function buildMarkerRenamePlan(input: {
  mapId: number;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  anchorPointId?: number | null;
}): MarkerRenamePlan {
  const renumberPlan = planVirtualMarkerRenumber({
    mapId: input.mapId,
    mapPoints: input.mapPoints.map(toNamingSource),
    neighbors: input.markerNeighbors,
    anchorPointId: input.anchorPointId,
  });

  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));

  const proposals: MarkerRenameProposal[] = renumberPlan.changes.map((change) => {
    const point = pointsById.get(change.pointId);
    if (!point) {
      throw new Error(`Missing map point ${change.pointId}`);
    }

    const kind = resolveMarkerKind(point);
    const display = proposeDisplayName(point, change.anchorRef, change.after.ref);

    return {
      pointId: change.pointId,
      anchorRef: change.anchorRef,
      kind,
      beforeRef: change.before.ref,
      beforeName: change.before.name,
      afterRef: change.after.ref,
      afterName: display.name,
      afterParentRef: change.after.parentRef,
      afterSortOrder: change.after.sortOrder,
      reason: display.reason,
      neighborLabels: buildNeighborLabels(change.pointId, input.mapPoints, input.markerNeighbors),
      category: point.category,
      latitude: point.latitude,
      longitude: point.longitude,
    };
  });

  return {
    mapId: input.mapId,
    anchorCount: renumberPlan.anchorCount,
    proposalCount: proposals.length,
    unchangedCount: renumberPlan.unchangedCount,
    proposals,
  };
}
