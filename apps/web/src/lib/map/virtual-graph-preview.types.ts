import type { StoredLineStringGeometry } from "@/types/map/geo-segments";
import type { BuildSegmentsFromPathPreview } from "@/types/map/segment-build";

export type VirtualPreviewEdge = {
  pathSlug: string;
  fromRef: string;
  toRef: string;
  geometry: StoredLineStringGeometry;
  lengthM: number;
};

export type VirtualPathPreview = BuildSegmentsFromPathPreview & {
  edgeCount: number;
};

export function flattenVirtualPreviewEdges(
  previews: Map<string, VirtualPathPreview>,
  visibleSlugs: ReadonlySet<string>,
): VirtualPreviewEdge[] {
  const edges: VirtualPreviewEdge[] = [];

  for (const [pathSlug, preview] of previews) {
    if (!visibleSlugs.has(pathSlug)) {
      continue;
    }
    for (const proposed of preview.proposed) {
      edges.push({
        pathSlug,
        fromRef: proposed.fromRef,
        toRef: proposed.toRef,
        geometry: proposed.geometry,
        lengthM: proposed.lengthM,
      });
    }
  }

  return edges;
}
