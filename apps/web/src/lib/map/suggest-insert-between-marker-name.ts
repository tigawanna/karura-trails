import { haversineDistanceMeters } from "@/lib/map/geo";
import {
  formatLandmarkCaptureDescription,
  formatMapMarkerCaptureDescription,
  inferCaptureTrailName,
} from "@/lib/map/map-marker-capture-description";
import {
  humanizeFeatureSlug,
  inferMapPointFeatureSlugs,
  resolveMapPointFeatureSlugs,
} from "@/lib/map/map-point-features";
import type { InsertBetweenEdgeCandidate } from "@/lib/map/suggest-insert-between-edges";
import {
  isPhysicalMapPoint,
  resolveMapPointLabel,
  suggestNextVirtualMarkerRef,
  type MapPointPlacementSource,
} from "@/lib/map/virtual-marker-naming";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";

export type InsertBetweenNamingResult = {
  name: string;
  ref: string | null;
  parentRef: string | null;
  description: string;
};

const LANDMARK_FEATURE_SLUGS = new Set([
  "bench",
  "toilet",
  "waterfall",
  "bridge",
  "picnic",
  "viewpoint",
  "cave",
  "water",
  "memorial",
  "information",
  "parking",
  "rest_area",
]);

function projectTOnSegment(
  latitude: number,
  longitude: number,
  fromPoint: MapPointPlacementSource,
  toPoint: MapPointPlacementSource,
): number {
  const deltaLat = toPoint.latitude - fromPoint.latitude;
  const deltaLng = toPoint.longitude - fromPoint.longitude;
  const lengthSquared = deltaLat * deltaLat + deltaLng * deltaLng;
  if (lengthSquared < 1e-18) {
    return 0.5;
  }
  return Math.max(
    0,
    Math.min(
      1,
      ((latitude - fromPoint.latitude) * deltaLat + (longitude - fromPoint.longitude) * deltaLng) /
        lengthSquared,
    ),
  );
}

function countFeatureMarkersBetween(input: {
  fromPoint: MapPointPlacementSource;
  toPoint: MapPointPlacementSource;
  allPoints: MapPointPlacementSource[];
  featureSlug: string;
}): number {
  let count = 0;

  for (const point of input.allPoints) {
    if (point.id === input.fromPoint.id || point.id === input.toPoint.id) {
      continue;
    }

    const slugs = resolveMapPointFeatureSlugs({
      category: "custom",
      name: point.name,
      ref: point.ref,
      metadata: point.metadata,
    });
    if (!slugs.includes(input.featureSlug)) {
      continue;
    }

    const t = projectTOnSegment(point.latitude, point.longitude, input.fromPoint, input.toPoint);
    if (t <= 0.02 || t >= 0.98) {
      continue;
    }

    const distanceToSegment = haversineDistanceMeters(
      point.latitude,
      point.longitude,
      input.fromPoint.latitude + (input.toPoint.latitude - input.fromPoint.latitude) * t,
      input.fromPoint.longitude + (input.toPoint.longitude - input.fromPoint.longitude) * t,
    );

    if (distanceToSegment <= 40) {
      count += 1;
    }
  }

  return count;
}

function resolvePrimaryFeatureSlug(input: {
  name?: string | null;
  ref?: string | null;
  description?: string | null;
  featureTags?: Record<string, string>;
}): string | null {
  const slugs = inferMapPointFeatureSlugs({
    category: "custom",
    name: input.name,
    ref: input.ref,
    metadata: input.featureTags,
  });
  if (slugs.length > 0) {
    return slugs[0] ?? null;
  }

  const haystack = `${input.name ?? ""} ${input.description ?? ""}`.toLowerCase();
  if (haystack.includes("bench")) {
    return "bench";
  }
  if (haystack.includes("toilet") || haystack.includes("loo")) {
    return "toilet";
  }
  if (haystack.includes("waterfall")) {
    return "waterfall";
  }
  if (haystack.includes("bridge")) {
    return "bridge";
  }

  return null;
}

function buildInsertBetweenDescription(input: {
  featureSlug: string | null;
  name: string;
  trailName: string | null;
  captureLatitude: number;
  captureLongitude: number;
  captureElevation: number | null;
}): string {
  if (input.featureSlug) {
    return formatLandmarkCaptureDescription({
      featureSlug: input.featureSlug,
      trailName: input.trailName,
      elevationMeters: input.captureElevation,
      latitude: input.captureLatitude,
      longitude: input.captureLongitude,
    });
  }

  return formatMapMarkerCaptureDescription({
    trailName: input.trailName,
    latitude: input.captureLatitude,
    longitude: input.captureLongitude,
    elevationMeters: input.captureElevation,
    subjectName: input.name,
  });
}

function suggestLandmarkInsertName(input: {
  fromPoint: MapPointPlacementSource & { description?: string | null };
  toPoint: MapPointPlacementSource & { description?: string | null };
  allPoints: MapPointPlacementSource[];
  featureSlug: string;
  captureLatitude: number;
  captureLongitude: number;
  captureElevation: number | null;
  geoSegments?: GeoSegmentRecord[];
}): InsertBetweenNamingResult {
  const fromLabel = resolveMapPointLabel(input.fromPoint);
  const featureLabel = humanizeFeatureSlug(input.featureSlug);
  const existingCount = countFeatureMarkersBetween({
    fromPoint: input.fromPoint,
    toPoint: input.toPoint,
    allPoints: input.allPoints,
    featureSlug: input.featureSlug,
  });

  const trailName = inferCaptureTrailName({
    latitude: input.captureLatitude,
    longitude: input.captureLongitude,
    geoSegments: input.geoSegments,
    neighborDescriptions: [input.fromPoint.description, input.toPoint.description],
  });

  if (existingCount === 0 && fromLabel) {
    const name = `${fromLabel} - ${featureLabel.toLowerCase()}`;
    return {
      name,
      ref: null,
      parentRef: input.fromPoint.parentRef?.trim() || null,
      description: buildInsertBetweenDescription({
        featureSlug: input.featureSlug,
        name,
        trailName,
        captureLatitude: input.captureLatitude,
        captureLongitude: input.captureLongitude,
        captureElevation: input.captureElevation,
      }),
    };
  }

  const name = `${featureLabel} ${existingCount + 1}`;
  return {
    name,
    ref: null,
    parentRef: input.fromPoint.parentRef?.trim() || null,
    description: buildInsertBetweenDescription({
      featureSlug: input.featureSlug,
      name,
      trailName,
      captureLatitude: input.captureLatitude,
      captureLongitude: input.captureLongitude,
      captureElevation: input.captureElevation,
    }),
  };
}

export function suggestInsertBetweenMarkerName(input: {
  edge: InsertBetweenEdgeCandidate;
  fromPoint: MapPointPlacementSource & { description?: string | null };
  toPoint: MapPointPlacementSource & { description?: string | null };
  allPoints: MapPointPlacementSource[];
  captureLatitude: number;
  captureLongitude: number;
  captureElevation?: number | null;
  geoSegments?: GeoSegmentRecord[];
  draftName?: string | null;
  draftDescription?: string | null;
  draftRef?: string | null;
  featureTags?: Record<string, string>;
}): InsertBetweenNamingResult {
  const bothPhysical = isPhysicalMapPoint(input.fromPoint) && isPhysicalMapPoint(input.toPoint);
  const bothVirtualOrLandmark =
    !isPhysicalMapPoint(input.fromPoint) && !isPhysicalMapPoint(input.toPoint);

  let featureSlug = resolvePrimaryFeatureSlug({
    name: input.draftName,
    ref: input.draftRef,
    description: input.draftDescription,
    featureTags: input.featureTags,
  });

  if (!featureSlug && bothVirtualOrLandmark) {
    featureSlug = "bench";
  }

  const preferLandmarkName =
    bothPhysical ||
    bothVirtualOrLandmark ||
    (featureSlug !== null && LANDMARK_FEATURE_SLUGS.has(featureSlug));

  const trailName = inferCaptureTrailName({
    latitude: input.captureLatitude,
    longitude: input.captureLongitude,
    geoSegments: input.geoSegments,
    neighborDescriptions: [input.fromPoint.description, input.toPoint.description],
  });
  const captureElevation = input.captureElevation ?? null;

  if (preferLandmarkName && featureSlug) {
    return suggestLandmarkInsertName({
      fromPoint: input.fromPoint,
      toPoint: input.toPoint,
      allPoints: input.allPoints,
      featureSlug,
      captureLatitude: input.captureLatitude,
      captureLongitude: input.captureLongitude,
      captureElevation,
      geoSegments: input.geoSegments,
    });
  }

  const virtualSuggestion = suggestNextVirtualMarkerRef({
    headPoint: input.fromPoint,
    allPoints: input.allPoints,
  });
  if (virtualSuggestion) {
    return {
      ...virtualSuggestion,
      description: buildInsertBetweenDescription({
        featureSlug,
        name: virtualSuggestion.name,
        trailName,
        captureLatitude: input.captureLatitude,
        captureLongitude: input.captureLongitude,
        captureElevation,
      }),
    };
  }

  const fromLabel = resolveMapPointLabel(input.fromPoint);
  const toLabel = resolveMapPointLabel(input.toPoint);
  if (fromLabel && toLabel) {
    const name = `${fromLabel} - ${toLabel}`;
    return {
      name,
      ref: null,
      parentRef: null,
      description: buildInsertBetweenDescription({
        featureSlug,
        name,
        trailName,
        captureLatitude: input.captureLatitude,
        captureLongitude: input.captureLongitude,
        captureElevation,
      }),
    };
  }

  const name = input.draftName?.trim() || "Map position";
  return {
    name,
    ref: input.draftRef?.trim() || null,
    parentRef: null,
    description: buildInsertBetweenDescription({
      featureSlug,
      name,
      trailName,
      captureLatitude: input.captureLatitude,
      captureLongitude: input.captureLongitude,
      captureElevation,
    }),
  };
}

export function toMapPointPlacementSource(point: MapPointRecord): MapPointPlacementSource & {
  description: string | null;
} {
  return {
    id: point.id,
    ref: point.ref,
    name: point.name,
    parentRef: point.parentRef,
    sortOrder: point.sortOrder,
    metadata: point.metadata,
    latitude: point.latitude,
    longitude: point.longitude,
    description: point.description,
  };
}
