import {
  formatMapMarkerCaptureDescription,
  inferCaptureTrailName,
} from "@/lib/map/map-marker-capture-description";
import type { InsertBetweenEdgeCandidate } from "@/lib/map/suggest-insert-between-edges";
import {
  suggestInsertBetweenMarkerName,
  toMapPointPlacementSource,
} from "@/lib/map/suggest-insert-between-marker-name";
import { suggestInsertBetweenEdges } from "@/lib/map/suggest-insert-between-edges";
import {
  resolveCreateMapPointRefFields,
  suggestNextVirtualMarkerRef,
  suggestVirtualMarkerRefForPlacement,
  type MapPointPlacementSource,
} from "@/lib/map/virtual-marker-naming";
import type { CreateMapPointInput } from "@/types/map/map-points";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";

export type InsertBetweenEdgeSelection = Pick<
  InsertBetweenEdgeCandidate,
  "fromMarkerId" | "toMarkerId" | "fromRef" | "toRef"
>;

export type MapMarkerSaveDraft = {
  name: string;
  ref?: string | null;
  parentRef?: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  insertBetween?: InsertBetweenEdgeSelection | null;
  insertBetweenCandidates?: InsertBetweenEdgeSelection[];
};

export type VirtualMarkerCaptureContext = {
  linkMode: boolean;
  chainPointIds: number[];
  mapPoints: MapPointPlacementSource[];
  captureCoordinates?: { latitude: number; longitude: number };
  maxAnchorDistanceMeters?: number;
};

export function buildMapMarkerDraftFromCoordinates(input: {
  latitude: number;
  longitude: number;
  geoSegments?: GeoSegmentRecord[];
}): MapMarkerSaveDraft {
  const trailName = inferCaptureTrailName({
    latitude: input.latitude,
    longitude: input.longitude,
    geoSegments: input.geoSegments,
  });
  const description = formatMapMarkerCaptureDescription({
    trailName,
    latitude: input.latitude,
    longitude: input.longitude,
    elevationMeters: null,
  });

  return {
    name: trailName ?? "Map position",
    description,
    latitude: input.latitude,
    longitude: input.longitude,
    elevation: null,
  };
}

export function applyInsertBetweenSuggestionsToDraft(
  draft: MapMarkerSaveDraft,
  input: {
    mapPoints: MapPointRecord[];
    markerNeighbors: MarkerNeighborRecord[];
    geoSegments?: GeoSegmentRecord[];
    limit?: number;
  },
): MapMarkerSaveDraft {
  const candidates = suggestInsertBetweenEdges({
    latitude: draft.latitude,
    longitude: draft.longitude,
    mapPoints: input.mapPoints,
    markerNeighbors: input.markerNeighbors,
    limit: input.limit ?? 5,
  });

  if (candidates.length === 0) {
    return draft;
  }

  const placementPoints = input.mapPoints.map(toMapPointPlacementSource);
  const pointsById = new Map(placementPoints.map((point) => [point.id, point]));
  const selected = candidates[0];
  if (!selected) {
    return draft;
  }

  const fromPoint = pointsById.get(selected.fromMarkerId);
  const toPoint = pointsById.get(selected.toMarkerId);
  if (!fromPoint || !toPoint) {
    return {
      ...draft,
      insertBetweenCandidates: candidates.map((candidate) => ({
        fromMarkerId: candidate.fromMarkerId,
        toMarkerId: candidate.toMarkerId,
        fromRef: candidate.fromRef,
        toRef: candidate.toRef,
      })),
    };
  }

  const naming = suggestInsertBetweenMarkerName({
    edge: selected,
    fromPoint,
    toPoint,
    allPoints: placementPoints,
    captureLatitude: draft.latitude,
    captureLongitude: draft.longitude,
    captureElevation: draft.elevation,
    geoSegments: input.geoSegments,
    draftName: draft.name,
    draftDescription: draft.description,
    draftRef: draft.ref,
  });

  return {
    ...draft,
    name: naming.name,
    ref: naming.ref,
    parentRef: naming.parentRef,
    description: naming.description,
    insertBetween: {
      fromMarkerId: selected.fromMarkerId,
      toMarkerId: selected.toMarkerId,
      fromRef: selected.fromRef,
      toRef: selected.toRef,
    },
    insertBetweenCandidates: candidates.map((candidate) => ({
      fromMarkerId: candidate.fromMarkerId,
      toMarkerId: candidate.toMarkerId,
      fromRef: candidate.fromRef,
      toRef: candidate.toRef,
    })),
  };
}

export function applySelectedInsertBetweenToDraft(
  draft: MapMarkerSaveDraft,
  selection: InsertBetweenEdgeSelection,
  mapPoints: MapPointRecord[],
  geoSegments?: GeoSegmentRecord[],
): MapMarkerSaveDraft {
  const placementPoints = mapPoints.map(toMapPointPlacementSource);
  const pointsById = new Map(placementPoints.map((point) => [point.id, point]));
  const fromPoint = pointsById.get(selection.fromMarkerId);
  const toPoint = pointsById.get(selection.toMarkerId);
  if (!fromPoint || !toPoint) {
    return { ...draft, insertBetween: selection };
  }

  const naming = suggestInsertBetweenMarkerName({
    edge: {
      ...selection,
      distanceToSegmentMeters: 0,
      segmentLengthMeters: 0,
      projectionT: 0.5,
    },
    fromPoint,
    toPoint,
    allPoints: placementPoints,
    captureLatitude: draft.latitude,
    captureLongitude: draft.longitude,
    captureElevation: draft.elevation,
    geoSegments,
    draftName: draft.name,
    draftDescription: draft.description,
    draftRef: draft.ref,
  });

  return {
    ...draft,
    name: naming.name,
    ref: naming.ref,
    parentRef: naming.parentRef,
    description: naming.description,
    insertBetween: selection,
  };
}

export function applyVirtualMarkerNamingToDraft(
  draft: MapMarkerSaveDraft,
  context?: VirtualMarkerCaptureContext,
): MapMarkerSaveDraft {
  if (draft.insertBetween) {
    return draft;
  }

  if (context?.linkMode && context.chainPointIds.length > 0) {
    const headPointId = context.chainPointIds.at(-1);
    const headPoint = context.mapPoints.find((point) => point.id === headPointId);
    if (headPoint) {
      const suggestion = suggestNextVirtualMarkerRef({
        headPoint,
        allPoints: context.mapPoints,
      });
      if (suggestion) {
        return {
          ...draft,
          ref: suggestion.ref,
          parentRef: suggestion.parentRef,
          name: suggestion.name,
        };
      }
    }
  }

  if (draft.ref?.trim()) {
    return draft;
  }

  if (context && context.mapPoints.length > 0) {
    const captureCoordinates = context.captureCoordinates ?? {
      latitude: draft.latitude,
      longitude: draft.longitude,
    };
    const placement = suggestVirtualMarkerRefForPlacement({
      latitude: captureCoordinates.latitude,
      longitude: captureCoordinates.longitude,
      allPoints: context.mapPoints,
      maxDistanceMeters: context.maxAnchorDistanceMeters,
    });
    if (placement) {
      return {
        ...draft,
        ref: placement.ref,
        parentRef: placement.parentRef,
        name: placement.name,
      };
    }
  }

  return draft;
}

export function finalizeMapMarkerCaptureDraft(
  draft: MapMarkerSaveDraft,
  input: {
    mapPoints: MapPointRecord[];
    markerNeighbors: MarkerNeighborRecord[];
    geoSegments?: GeoSegmentRecord[];
    virtualContext?: VirtualMarkerCaptureContext;
  },
): MapMarkerSaveDraft {
  const withBetween = applyInsertBetweenSuggestionsToDraft(draft, {
    mapPoints: input.mapPoints,
    markerNeighbors: input.markerNeighbors,
    geoSegments: input.geoSegments,
  });
  if (withBetween.insertBetween) {
    return withBetween;
  }
  return applyVirtualMarkerNamingToDraft(withBetween, input.virtualContext);
}

export function mapMarkerDraftToCreateInput(
  mapId: number,
  draft: MapMarkerSaveDraft,
): CreateMapPointInput {
  const refFields = resolveCreateMapPointRefFields({
    name: draft.name,
    ref: draft.ref,
    parentRef: draft.parentRef,
  });

  return {
    mapId,
    latitude: draft.latitude,
    longitude: draft.longitude,
    ref: refFields.ref,
    name: refFields.name,
    parentRef: refFields.parentRef,
    description: draft.description?.trim() || null,
    elevation: draft.elevation,
    elevationSource: draft.elevation != null ? "inferred_from_path" : null,
    category: "custom",
    metadata: {},
  };
}
