import {
  formatMapPointFeatureSlugs,
  resolveMapPointFeatureSlugs,
  type PointMetadata,
} from "@/geo/map-point-features";
import type { LandmarkTypeRecord } from "@/geo/landmark-type-records";
import type { PointWithGeometry } from "@/data-access-layer/points";

export function parsePointMetadata(metadataJson: string | null | undefined): PointMetadata {
  if (!metadataJson?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadataJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const metadata: PointMetadata = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        metadata[key] = value;
      }
    }
    return metadata;
  } catch {
    return {};
  }
}

export type EnrichedRoutingPoint = PointWithGeometry & {
  metadata: PointMetadata;
  featureSlugs: string[];
  featureLabels: string;
};

export function enrichRoutingPoint(
  point: PointWithGeometry,
  catalog: LandmarkTypeRecord[],
): EnrichedRoutingPoint {
  const metadata = parsePointMetadata(point.metadataJson);
  const featureSlugs = resolveMapPointFeatureSlugs({
    category: point.category,
    name: point.name,
    ref: point.ref,
    metadata,
  });

  return {
    ...point,
    metadata,
    featureSlugs,
    featureLabels: formatMapPointFeatureSlugs(featureSlugs, catalog),
  };
}
