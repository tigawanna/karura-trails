import type { ProposedSegmentEdge, SegmentationSkippedMarker } from "@/lib/map/segmentation";
import type { SegmentEdgeRecord } from "@/types/map/segment-edges";

export type BuildSegmentsFromPathPreview = {
  pathSlug: string;
  proposed: ProposedSegmentEdge[];
  skippedMarkers: SegmentationSkippedMarker[];
};

export type BuildSegmentsFromPathResult = {
  pathSlug: string;
  created: SegmentEdgeRecord[];
  deletedCount: number;
};
