import { normalizeLandmarkSlug } from "@/lib/map/normalize-landmark-slug";
import type { MapPointCategory, MapPointMetadata } from "@/types/map/map-points";

export const MAP_POINT_FEATURES_METADATA_KEY = "features";

export function humanizeFeatureSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseMapPointFeatureSlugs(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  const slugs = new Set<string>();
  for (const token of value.split(/[,;]+/)) {
    const slug = normalizeLandmarkSlug(token);
    if (slug) {
      slugs.add(slug);
    }
  }
  return [...slugs].sort();
}

function readExplicitMapPointFeatureSlugs(metadata: MapPointMetadata | undefined): string[] {
  return parseMapPointFeatureSlugs(metadata?.[MAP_POINT_FEATURES_METADATA_KEY]);
}

function haystackIncludes(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

export function inferMapPointFeatureSlugs(input: {
  category: MapPointCategory;
  name?: string | null;
  ref?: string | null;
  metadata?: MapPointMetadata;
}): string[] {
  const slugs = new Set<string>();
  const label = `${input.name ?? ""} ${input.ref ?? ""}`.trim();

  if (input.category === "bridge") {
    slugs.add("bridge");
  }
  if (input.category === "gate") {
    slugs.add("gate");
  }
  if (input.category === "cave") {
    slugs.add("cave");
  }
  if (input.category === "viewpoint") {
    slugs.add("viewpoint");
  }
  if (input.category === "water") {
    slugs.add("water");
  }
  if (input.category === "rest_area") {
    slugs.add("rest_area");
  }
  if (input.category === "sign") {
    slugs.add("sign");
  }
  if (input.category === "bench") {
    slugs.add("bench");
  }
  if (input.category === "waterfall") {
    slugs.add("waterfall");
  }
  if (input.category === "junction") {
    slugs.add("trail_junction");
  }

  if (haystackIncludes(label, ["bench"])) {
    slugs.add("bench");
  }
  if (haystackIncludes(label, ["waterfall", "falls"])) {
    slugs.add("waterfall");
  }
  if (haystackIncludes(label, ["toilet", "loo", "restroom", "wc"])) {
    slugs.add("toilet");
  }
  if (haystackIncludes(label, ["bridge"])) {
    slugs.add("bridge");
  }
  if (haystackIncludes(label, ["picnic"])) {
    slugs.add("picnic");
  }
  if (haystackIncludes(label, ["parking", "car park"])) {
    slugs.add("parking");
  }

  return [...slugs].sort();
}

export function resolveMapPointFeatureSlugs(input: {
  category: MapPointCategory;
  name?: string | null;
  ref?: string | null;
  metadata?: MapPointMetadata;
}): string[] {
  const explicit = readExplicitMapPointFeatureSlugs(input.metadata);
  if (explicit.length > 0) {
    return explicit;
  }
  return inferMapPointFeatureSlugs(input);
}
