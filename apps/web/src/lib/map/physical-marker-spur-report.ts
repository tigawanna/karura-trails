import { buildMarkerNeighborIndex } from "@/lib/map/marker-neighbor-index";
import {
  isPhysicalMapPoint,
  resolveMapPointLabel,
  type MapPointNamingSource,
} from "@/lib/map/virtual-marker-naming";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";

export type PhysicalAnchorSpurLeg = {
  anchorId: number;
  anchorLabel: string;
  towardId: number | null;
  towardLabel: string | null;
  markerIds: number[];
  markerLabels: string[];
  markerLabelsCsv: string;
};

export type PhysicalMarkerSpurReport = {
  mapId: number;
  physicalMarkers: Array<{ id: number; label: string }>;
  legs: PhysicalAnchorSpurLeg[];
};

function getUndirectedNeighborIds(
  markerId: number,
  index: ReturnType<typeof buildMarkerNeighborIndex>,
): number[] {
  return [
    ...new Set<number>([
      ...(index.outgoing.get(markerId) ?? []),
      ...(index.incoming.get(markerId) ?? []),
    ]),
  ];
}

function resolveLabel(point: MapPointNamingSource | MapPointRecord): string {
  return resolveMapPointLabel(point) || `#${point.id}`;
}

function walkChainUntilPhysical(input: {
  startId: number;
  fromId: number;
  pointsById: Map<number, MapPointRecord>;
  physicalIds: Set<number>;
  index: ReturnType<typeof buildMarkerNeighborIndex>;
}): { markerIds: number[]; towardId: number | null } {
  const markerIds: number[] = [];
  let currentId: number | null = input.startId;
  let previousId = input.fromId;
  let towardId: number | null = null;

  while (currentId !== null) {
    if (input.physicalIds.has(currentId)) {
      towardId = currentId;
      break;
    }

    const point = input.pointsById.get(currentId);
    if (!point) {
      break;
    }

    markerIds.push(currentId);

    const neighbors: number[] = getUndirectedNeighborIds(currentId, input.index).filter(
      (neighborId: number) => neighborId !== previousId,
    );

    const nonPhysicalNeighbors: number[] = neighbors.filter(
      (neighborId: number) => !input.physicalIds.has(neighborId),
    );
    const physicalNeighbors: number[] = neighbors.filter((neighborId: number) =>
      input.physicalIds.has(neighborId),
    );

    if (nonPhysicalNeighbors.length === 1) {
      previousId = currentId;
      currentId = nonPhysicalNeighbors[0] ?? null;
      continue;
    }

    if (nonPhysicalNeighbors.length === 0 && physicalNeighbors.length === 1) {
      towardId = physicalNeighbors[0] ?? null;
      break;
    }

    if (nonPhysicalNeighbors.length === 0) {
      break;
    }

    previousId = currentId;
    currentId = nonPhysicalNeighbors.sort((left, right) => left - right)[0] ?? null;
  }

  return { markerIds, towardId };
}

export function buildPhysicalMarkerSpurReport(input: {
  mapId: number;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
}): PhysicalMarkerSpurReport {
  const index = buildMarkerNeighborIndex(input.markerNeighbors);
  const pointsById = new Map(input.mapPoints.map((point) => [point.id, point]));

  const physicalPoints = input.mapPoints.filter((point) => isPhysicalMapPoint(point));
  const physicalIds = new Set(physicalPoints.map((point) => point.id));

  const physicalMarkers = physicalPoints
    .map((point) => ({ id: point.id, label: resolveLabel(point) }))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));

  const legs: PhysicalAnchorSpurLeg[] = [];

  for (const anchor of physicalPoints) {
    const anchorLabel = resolveLabel(anchor);
    const neighborIds = getUndirectedNeighborIds(anchor.id, index).sort(
      (left, right) => left - right,
    );

    for (const neighborId of neighborIds) {
      const neighbor = pointsById.get(neighborId);
      if (!neighbor) {
        continue;
      }

      if (physicalIds.has(neighborId)) {
        legs.push({
          anchorId: anchor.id,
          anchorLabel,
          towardId: neighborId,
          towardLabel: resolveLabel(neighbor),
          markerIds: [],
          markerLabels: [],
          markerLabelsCsv: "",
        });
        continue;
      }

      const walked = walkChainUntilPhysical({
        startId: neighborId,
        fromId: anchor.id,
        pointsById,
        physicalIds,
        index,
      });

      const markerLabels = walked.markerIds.map((markerId) => {
        const point = pointsById.get(markerId);
        return point ? resolveLabel(point) : `#${markerId}`;
      });

      const towardPoint = walked.towardId ? pointsById.get(walked.towardId) : null;

      legs.push({
        anchorId: anchor.id,
        anchorLabel,
        towardId: walked.towardId,
        towardLabel: towardPoint ? resolveLabel(towardPoint) : null,
        markerIds: walked.markerIds,
        markerLabels,
        markerLabelsCsv: markerLabels.join(", "),
      });
    }
  }

  legs.sort((left, right) => {
    const anchorCompare = left.anchorLabel.localeCompare(right.anchorLabel, undefined, {
      numeric: true,
    });
    if (anchorCompare !== 0) {
      return anchorCompare;
    }
    const towardLeft = left.towardLabel ?? "dead end";
    const towardRight = right.towardLabel ?? "dead end";
    return towardLeft.localeCompare(towardRight, undefined, { numeric: true });
  });

  return {
    mapId: input.mapId,
    physicalMarkers,
    legs,
  };
}

export function formatPhysicalMarkerSpurReportText(report: PhysicalMarkerSpurReport): string {
  const lines: string[] = [
    `Physical marker spur report — map ${report.mapId}`,
    "",
    `Physical markers (${report.physicalMarkers.length}): ${report.physicalMarkers.map((entry) => entry.label).join(", ") || "(none)"}`,
    "",
  ];

  if (report.legs.length === 0) {
    lines.push("No neighbor legs found. Link markers before generating this report.");
    return lines.join("\n");
  }

  let currentAnchor: string | null = null;
  for (const leg of report.legs) {
    if (leg.anchorLabel !== currentAnchor) {
      currentAnchor = leg.anchorLabel;
      lines.push(`## ${leg.anchorLabel}`);
    }

    const toward = leg.towardLabel ?? "dead end";
    if (leg.markerLabelsCsv) {
      lines.push(`  → ${toward}: ${leg.markerLabelsCsv}`);
    } else if (leg.towardLabel) {
      lines.push(`  → ${toward}: (direct link, no markers between)`);
    } else {
      lines.push(`  → ${toward}: (no markers on this leg)`);
    }
  }

  return lines.join("\n");
}
