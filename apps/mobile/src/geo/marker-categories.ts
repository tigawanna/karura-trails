import {
  MAP_POINT_FEATURES_METADATA_KEY,
  parseMapPointFeatureSlugs,
} from "@/geo/map-point-features";
import { MARKER_CATEGORY_OPTIONS } from "@/geo/marker-category-options";
import { parsePointMetadata } from "@/geo/point-record";
import type { PointCategory } from "@/lib/drizzle/schema/points";

const POINT_CATEGORY_SET = new Set<PointCategory>(MARKER_CATEGORY_OPTIONS.map((option) => option.value));

export function isPointCategory(value: string): value is PointCategory {
  return POINT_CATEGORY_SET.has(value as PointCategory);
}

export function primaryMarkerCategory(selected: PointCategory[]): PointCategory {
  for (const option of MARKER_CATEGORY_OPTIONS) {
    if (selected.includes(option.value)) {
      return option.value;
    }
  }
  return "custom";
}

export function readMarkerCategories(input: {
  category: string | null;
  metadataJson?: string | null;
}): PointCategory[] {
  const metadata = parsePointMetadata(input.metadataJson);
  const fromFeatures = parseMapPointFeatureSlugs(metadata[MAP_POINT_FEATURES_METADATA_KEY]).filter(
    isPointCategory,
  );
  if (fromFeatures.length > 0) {
    return fromFeatures;
  }
  if (input.category && isPointCategory(input.category)) {
    return [input.category];
  }
  return ["custom"];
}

export function toggleMarkerCategory(
  current: PointCategory[],
  value: PointCategory,
): PointCategory[] {
  if (current.includes(value)) {
    if (current.length === 1) {
      return current;
    }
    return current.filter((entry) => entry !== value);
  }
  return [...current, value];
}

export function serializeMarkerCategories(categories: PointCategory[]): {
  category: PointCategory;
  metadataJson: string;
} {
  const unique = [...new Set(categories.filter(isPointCategory))];
  const normalized = unique.length > 0 ? unique : (["custom"] as PointCategory[]);
  const metadata = parsePointMetadata("{}");
  metadata[MAP_POINT_FEATURES_METADATA_KEY] = normalized.join(",");
  return {
    category: primaryMarkerCategory(normalized),
    metadataJson: JSON.stringify(metadata),
  };
}

export function mergeMarkerCategoryMetadata(
  existingMetadataJson: string | null | undefined,
  categories: PointCategory[],
): string {
  const metadata = parsePointMetadata(existingMetadataJson);
  const normalized = [...new Set(categories.filter(isPointCategory))];
  const selected = normalized.length > 0 ? normalized : (["custom"] as PointCategory[]);
  metadata[MAP_POINT_FEATURES_METADATA_KEY] = selected.join(",");
  return JSON.stringify(metadata);
}

export function formatMarkerCategoryLabels(categories: PointCategory[]): string {
  const labels = categories.map((value) => {
    const match = MARKER_CATEGORY_OPTIONS.find((option) => option.value === value);
    return match?.label ?? value.replaceAll("_", " ");
  });
  return labels.join(" · ");
}
