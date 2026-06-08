import type { StoredLineStringGeometry } from "@/types/map/geo-segments";

export type SegmentEdgeMetadata = Record<string, string>;

export type SegmentEdgeRecord = {
  id: number;
  mapId: number;
  fromRef: string;
  toRef: string;
  pathSlug: string;
  startFraction: number | null;
  endFraction: number | null;
  geometryJson: StoredLineStringGeometry | null;
  lengthM: number | null;
  kind: string;
  bidirectional: boolean;
  status: string;
  metadata: SegmentEdgeMetadata;
  createdAt: string;
  updatedAt: string;
};
