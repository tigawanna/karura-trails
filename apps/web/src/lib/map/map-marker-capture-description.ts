import { combineGroupCoordinates, projectPointFractionOnLine } from "@/lib/map/line-fraction";
import { humanizeFeatureSlug } from "@/lib/map/map-point-features";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";

export const CAPTURE_TRAIL_MAX_DISTANCE_METERS = 100;

export function extractTrailLabelFromDescription(
  description: string | null | undefined,
): string | null {
  const trimmed = description?.trim();
  if (!trimmed) {
    return null;
  }

  const beforeCoords = trimmed.split(/\s+at\s+-?\d+\.\d+/i)[0]?.trim();
  if (!beforeCoords) {
    return null;
  }

  if (/^captured$/i.test(beforeCoords)) {
    return null;
  }

  const parts = beforeCoords
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const trailLike = /(trail|track|path|route|way)/i;
  const trailPart = [...parts].reverse().find((part) => trailLike.test(part));
  if (trailPart) {
    return trailPart;
  }

  if (parts.length >= 2) {
    return parts.at(-1) ?? null;
  }

  return beforeCoords;
}

export function inferTrailNameFromGeoSegments(
  latitude: number,
  longitude: number,
  geoSegments: GeoSegmentRecord[],
  maxDistanceMeters = CAPTURE_TRAIL_MAX_DISTANCE_METERS,
): string | null {
  const groups = new Map<string, GeoSegmentRecord[]>();

  for (const segment of geoSegments) {
    const existing = groups.get(segment.segmentGroupId) ?? [];
    existing.push(segment);
    groups.set(segment.segmentGroupId, existing);
  }

  let best: { name: string; distanceMeters: number } | null = null;

  for (const [groupId, segments] of groups) {
    const coordinates = combineGroupCoordinates(
      segments.map((segment) => ({
        segmentIndex: segment.segmentIndex,
        geometry: segment.geometryJson,
      })),
    );
    const projection = projectPointFractionOnLine(longitude, latitude, coordinates);
    if (!projection || projection.distanceMeters > maxDistanceMeters) {
      continue;
    }

    const named = segments.find((segment) => segment.name);
    const name = named?.name ?? groupId;
    if (!best || projection.distanceMeters < best.distanceMeters) {
      best = { name, distanceMeters: projection.distanceMeters };
    }
  }

  return best?.name ?? null;
}

export function inferCaptureTrailName(input: {
  latitude: number;
  longitude: number;
  geoSegments?: GeoSegmentRecord[];
  neighborDescriptions?: Array<string | null | undefined>;
}): string | null {
  if (input.geoSegments && input.geoSegments.length > 0) {
    const fromSegments = inferTrailNameFromGeoSegments(
      input.latitude,
      input.longitude,
      input.geoSegments,
    );
    if (fromSegments) {
      return fromSegments;
    }
  }

  for (const description of input.neighborDescriptions ?? []) {
    const trail = extractTrailLabelFromDescription(description);
    if (trail) {
      return trail;
    }
  }

  return null;
}

export function formatLandmarkCaptureDescription(input: {
  featureSlug: string;
  trailName: string | null;
  elevationMeters: number | null;
  latitude: number;
  longitude: number;
}): string {
  const featureLabel = humanizeFeatureSlug(input.featureSlug);
  const elevationSuffix =
    input.elevationMeters != null ? ` · ${input.elevationMeters.toFixed(1)} m` : "";

  if (input.trailName) {
    return `${featureLabel} at ${input.trailName}${elevationSuffix}`;
  }

  const coords = `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`;
  return `${featureLabel} at ${coords}${elevationSuffix}`;
}

export function formatMapMarkerCaptureDescription(input: {
  trailName: string | null;
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  featureSlug?: string | null;
  subjectName?: string | null;
}): string {
  const elevationSuffix =
    input.elevationMeters != null ? ` · ${input.elevationMeters.toFixed(1)} m` : "";
  const coords = `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`;

  if (input.featureSlug) {
    return formatLandmarkCaptureDescription({
      featureSlug: input.featureSlug,
      trailName: input.trailName,
      elevationMeters: input.elevationMeters,
      latitude: input.latitude,
      longitude: input.longitude,
    });
  }

  if (input.subjectName?.trim()) {
    const subject = input.subjectName.trim();
    if (input.trailName) {
      return `${subject} at ${input.trailName}${elevationSuffix}`;
    }
    return `${subject} at ${coords}${elevationSuffix}`;
  }

  if (input.trailName) {
    return `${input.trailName} at ${coords}${elevationSuffix}`;
  }

  return `Captured at ${coords}${elevationSuffix}`;
}
