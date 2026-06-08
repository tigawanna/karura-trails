import type { LandmarkTypeRecord } from "@/geo/landmark-type-records";

export type PointMetadata = Record<string, string>;

export const MAP_POINT_FEATURES_METADATA_KEY = "features";

export function normalizeLandmarkSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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

function haystackIncludes(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

export function inferMapPointFeatureSlugs(input: {
  category: string | null;
  name?: string | null;
  ref?: string | null;
  metadata?: PointMetadata;
}): string[] {
  const slugs = new Set<string>();
  const metadata = input.metadata ?? {};
  const category = input.category ?? "custom";
  const label = `${input.name ?? ""} ${input.ref ?? ""} ${metadata.name ?? ""}`.trim();
  const type = metadata.type?.trim() ?? "";
  const maki = metadata.maki?.trim() ?? "";
  const structure = metadata.structure?.trim() ?? "";
  const mapboxClass = metadata.class?.trim() ?? "";

  if (category === "bridge" || structure === "bridge") {
    slugs.add("bridge");
  }
  if (category === "gate") {
    slugs.add("gate");
  }
  if (category === "cave") {
    slugs.add("cave");
  }
  if (category === "viewpoint") {
    slugs.add("viewpoint");
  }
  if (category === "water") {
    slugs.add("water");
  }
  if (category === "rest_area") {
    slugs.add("rest_area");
  }
  if (category === "sign") {
    slugs.add("sign");
  }
  if (category === "junction") {
    slugs.add("trail_junction");
  }

  if (type === "Toilets" || maki === "toilet") {
    slugs.add("toilet");
  }
  if (type === "Viewpoint" || maki === "viewpoint") {
    slugs.add("viewpoint");
  }
  if (type === "Guidepost" || maki === "guidepost") {
    slugs.add("sign");
  }
  if (type === "Information") {
    slugs.add("information");
  }
  if (type === "Memorial" || mapboxClass === "historic") {
    slugs.add("memorial");
  }
  if (mapboxClass === "water_feature" || type === "river" || maki === "water") {
    slugs.add("water");
  }
  if (maki === "picnic-site") {
    slugs.add("picnic");
  }
  if (maki === "parking") {
    slugs.add("parking");
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
  category: string | null;
  name?: string | null;
  ref?: string | null;
  metadata?: PointMetadata;
}): string[] {
  const explicit = parseMapPointFeatureSlugs(input.metadata?.[MAP_POINT_FEATURES_METADATA_KEY]);
  if (explicit.length > 0) {
    return explicit;
  }
  return inferMapPointFeatureSlugs(input);
}

export function resolveFeatureSlugLabel(slug: string, catalog: LandmarkTypeRecord[]): string {
  const normalized = normalizeLandmarkSlug(slug);
  const match = catalog.find((entry) => entry.slug === normalized);
  return match?.label ?? humanizeFeatureSlug(normalized);
}

export function formatMapPointFeatureSlugs(
  slugs: Iterable<string>,
  catalog: LandmarkTypeRecord[] = [],
): string {
  return [...slugs].map((slug) => resolveFeatureSlugLabel(slug, catalog)).join(", ");
}

export function mapPointFeatureSearchHaystack(
  input: {
    category: string | null;
    name?: string | null;
    ref?: string | null;
    description?: string | null;
    metadata?: PointMetadata;
  },
  catalog: LandmarkTypeRecord[] = [],
): string {
  const slugs = resolveMapPointFeatureSlugs(input);
  const metadataValues = Object.values(input.metadata ?? {})
    .filter((value) => typeof value === "string" && value.length > 0)
    .join(" ");

  return [
    input.name,
    input.ref,
    input.category,
    input.description,
    formatMapPointFeatureSlugs(slugs, catalog),
    ...slugs,
    metadataValues,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}
